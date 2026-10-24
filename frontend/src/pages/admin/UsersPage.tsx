import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/complaints/EmptyState";
import { QueryError } from "@/components/complaints/QueryError";
import { useDepartments } from "@/hooks/queries";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/types";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { apiErrorMessage, useDeactivateUser, useReactivateUser, useUsers } from "@/components/admin/admin-api";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { useDebouncedValue } from "@/components/admin/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLES: Role[] = ["STUDENT", "STAFF", "ADMIN"];
const PAGE_SIZE = 10;

function isRole(value: string | null): value is Role {
  return value === "STUDENT" || value === "STAFF" || value === "ADMIN";
}

function joinedLabel(iso: string): string {
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return format(date, "d MMM yyyy");
}

function UserActions({ user, onEdit }: { user: User; onEdit: (user: User) => void }) {
  return (
    <div className="flex justify-end">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(user)}>
        Edit
      </Button>
    </div>
  );
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const departmentsQuery = useDepartments();
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const roleParam = searchParams.get("role");
  const role = isRole(roleParam) ? roleParam : "";
  const departmentParam = searchParams.get("departmentId") ?? "";
  const departmentId = /^\d+$/.test(departmentParam) ? departmentParam : "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const urlSearch = searchParams.get("search") ?? "";

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    setSearchParams(
      (prev) => {
        const current = prev.get("search") ?? "";
        if (current === trimmed) return prev;
        const next = new URLSearchParams(prev);
        if (trimmed) next.set("search", trimmed);
        else next.delete("search");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const listParams = useMemo(
    () => ({
      role: role || undefined,
      departmentId: departmentId || undefined,
      search: urlSearch || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
    }),
    [role, departmentId, urlSearch, page],
  );
  const query = useUsers(listParams);
  const rows = query.data?.rows ?? [];
  const meta = query.data?.meta;
  const total = meta?.total ?? rows.length;
  const totalPages = meta?.totalPages ?? 1;

  useEffect(() => {
    if (!meta || query.isPlaceholderData || query.isPending) return;
    if (page <= meta.totalPages) return;
    const nextPage = meta.totalPages;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextPage <= 1) next.delete("page");
        else next.set("page", String(nextPage));
        return next;
      },
      { replace: true },
    );
  }, [meta, page, query.isPlaceholderData, query.isPending, setSearchParams]);

  function setParam(key: "role" | "departmentId", value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === "ALL") next.delete(key);
        else next.set(key, value);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function setPage(nextPage: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextPage <= 1) next.delete("page");
        else next.set("page", String(nextPage));
        return next;
      },
      { replace: true },
    );
  }

  function clearFilters() {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setDialogOpen(true);
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivate.mutateAsync(deactivateTarget.id);
      toast.success("User deactivated");
      setDeactivateTarget(null);
      setDeactivateError(null);
    } catch (error) {
      const message = apiErrorMessage(error, "Could not deactivate user");
      setDeactivateError(message);
      toast.error(message);
    }
  }

  function onActiveChange(user: User, active: boolean) {
    if (active) {
      void reactivate.mutateAsync(user.id).then(
        () => toast.success("User reactivated"),
        (error: unknown) => toast.error(apiErrorMessage(error, "Could not reactivate user")),
      );
      return;
    }
    setDeactivateError(null);
    setDeactivateTarget(user);
  }

  const pendingId = deactivate.isPending ? deactivate.variables : reactivate.isPending ? reactivate.variables : undefined;
  const hasFilters = Boolean(urlSearch || role || departmentId || searchInput.trim());
  const refreshing = query.isFetching && !query.isPending;
  const waitingForRows = rows.length === 0 && (query.isPending || query.isFetching || query.isPlaceholderData);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-500">
          Students, staff and admins. Deactivating an account is reversible — they stay on record but cannot sign in.
        </p>
        {meta ? (
          <p className="text-sm tabular-nums text-slate-500">
            {meta.total} {meta.total === 1 ? "user" : "users"}
          </p>
        ) : null}
      </div>

      <AdminToolbar
        id="user-search"
        search={searchInput}
        onSearchChange={setSearchInput}
        placeholder="Search name or email"
        addLabel="Add user"
        onAdd={openCreate}
        filters={
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
            <Select value={role || "ALL"} onValueChange={(value) => setParam("role", value)}>
              <SelectTrigger className="h-9 w-full lg:w-40" aria-label="Filter by role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[60]">
                <SelectItem value="ALL">All roles</SelectItem>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentId || "ALL"} onValueChange={(value) => setParam("departmentId", value)}>
              <SelectTrigger className="h-9 w-full lg:w-52" aria-label="Filter by department">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[60]">
                <SelectItem value="ALL">All departments</SelectItem>
                {(departmentsQuery.data ?? []).map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      {departmentsQuery.isError ? (
        <p className="text-sm text-rose-700">
          Could not load departments.{" "}
          <button type="button" className="font-medium underline" onClick={() => void departmentsQuery.refetch()}>
            Retry
          </button>
        </p>
      ) : null}

      {waitingForRows ? <ListSkeleton label="Loading users" /> : null}
      {!waitingForRows && query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
      {!waitingForRows && !query.isError && rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No users match these filters" : "No users yet"}
          description={
            hasFilters ? "Try another name, role or department." : "Add a student, staff member or admin."
          }
          action={
            hasFilters ? (
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button type="button" onClick={openCreate}>
                Add user
              </Button>
            )
          }
        />
      ) : null}
      {!waitingForRows && !query.isError && rows.length > 0 ? (
        <div className={cn("space-y-3", refreshing && "opacity-60")} aria-busy={refreshing}>
          {refreshing ? <span className="sr-only">Updating users</span> : null}
          <ul className="space-y-3 md:hidden">
            {rows.map((user) => (
              <li key={user.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                  </div>
                  <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{user.department?.name ?? "No department"}</p>
                <p className="mt-1 text-xs text-slate-400">Joined {joinedLabel(user.createdAt)}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <ActiveToggle
                    user={user}
                    isSelf={user.id === currentUser?.id}
                    pending={pendingId === user.id}
                    onActiveChange={onActiveChange}
                  />
                  <UserActions user={user} onEdit={openEdit} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">User</TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Department</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="hidden xl:table-cell">
                    Joined
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((user) => (
                  <TableRow key={user.id} className={user.isActive ? undefined : "text-slate-500"}>
                    <TableCell className="whitespace-normal">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department?.name ?? "—"}</TableCell>
                    <TableCell>
                      <ActiveToggle
                        user={user}
                        isSelf={user.id === currentUser?.id}
                        pending={pendingId === user.id}
                        onActiveChange={onActiveChange}
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{joinedLabel(user.createdAt)}</TableCell>
                    <TableCell>
                      <UserActions user={user} onEdit={openEdit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            limit={meta?.limit ?? PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <UserFormDialog
        open={dialogOpen}
        user={editing}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditing(null);
        }}
      />
      <ConfirmActionDialog
        open={deactivateTarget !== null}
        title={deactivateTarget ? `Deactivate ${deactivateTarget.name}?` : "Deactivate user?"}
        description="They will not be able to sign in. You can turn the account back on from this list."
        confirmLabel="Deactivate"
        pendingLabel="Deactivating…"
        pending={deactivate.isPending}
        errorMessage={deactivateError}
        onConfirm={() => void confirmDeactivate()}
        onOpenChange={(next) => {
          if (!next) {
            setDeactivateTarget(null);
            setDeactivateError(null);
          }
        }}
      />
    </div>
  );
}

function ActiveToggle({
  user,
  isSelf,
  pending,
  onActiveChange,
}: {
  user: User;
  isSelf: boolean;
  pending: boolean;
  onActiveChange: (user: User, active: boolean) => void;
}) {
  const label = isSelf
    ? "You can't deactivate your own account"
    : user.isActive
      ? `Deactivate ${user.name}`
      : `Reactivate ${user.name}`;

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={user.isActive}
        disabled={isSelf || pending}
        onCheckedChange={(checked) => onActiveChange(user, checked)}
        aria-label={label}
      />
      <span className={user.isActive ? "text-sm text-emerald-700" : "text-sm text-slate-500"}>
        {user.isActive ? "Active" : "Inactive"}
      </span>
    </div>
  );
}
