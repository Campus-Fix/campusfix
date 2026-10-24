import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/complaints/EmptyState";
import { QueryError } from "@/components/complaints/QueryError";
import { useDepartments } from "@/hooks/queries";
import type { Department } from "@/types";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { apiErrorMessage, useDeleteDepartment } from "@/components/admin/admin-api";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { DepartmentFormDialog } from "@/components/admin/DepartmentFormDialog";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function DepartmentActions({
  department,
  onEdit,
  onDelete,
}: {
  department: Department;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(department)}>
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => onDelete(department)}
        aria-label={`Delete ${department.name}`}
      >
        Delete
      </Button>
    </div>
  );
}

export function DepartmentsPage() {
  const query = useDepartments();
  const remove = useDeleteDepartment();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    const rows = query.data ?? [];
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.description]
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .includes(needle),
    );
  }, [query.data, search]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(department: Department) {
    setEditing(department);
    setDialogOpen(true);
  }

  function askDelete(department: Department) {
    setDeleteError(null);
    setDeleting(department);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Department deleted");
      setDeleting(null);
      setDeleteError(null);
    } catch (error) {
      const message = apiErrorMessage(error, "Could not delete department");
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-500">
          Campus teams that receive complaints. A department in use by categories or complaints cannot be deleted.
        </p>
        {query.data ? (
          <p className="text-sm tabular-nums text-slate-500">
            {search.trim()
              ? `${filtered.length} of ${query.data.length}`
              : `${query.data.length} ${query.data.length === 1 ? "department" : "departments"}`}
          </p>
        ) : null}
      </div>

      <AdminToolbar
        id="department-search"
        search={search}
        onSearchChange={setSearch}
        placeholder="Search departments"
        addLabel="Add department"
        onAdd={openCreate}
      />

      {query.isPending ? <ListSkeleton label="Loading departments" /> : null}
      {!query.isPending && query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {!query.isPending && !query.isError && filtered.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No departments match your search" : "No departments yet"}
          description={
            search.trim() ? "Try a different name or email." : "Add a department before you create categories."
          }
          action={
            search.trim() ? (
              <Button type="button" variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button type="button" onClick={openCreate}>
                Add department
              </Button>
            )
          }
        />
      ) : null}
      {!query.isPending && !query.isError && filtered.length > 0 ? (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((department) => (
              <li key={department.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-medium text-slate-900">{department.name}</p>
                <p className="mt-0.5 text-sm break-all text-slate-500">{department.email ?? "No email"}</p>
                {department.description ? <p className="mt-2 text-sm text-slate-600">{department.description}</p> : null}
                <p className="mt-2 text-xs text-slate-500">
                  {department.staffCount ?? 0} staff · {department.categoryCount ?? 0} categories
                </p>
                <div className="mt-3">
                  <DepartmentActions department={department} onEdit={openEdit} onDelete={askDelete} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Department</TableHead>
                  <TableHead scope="col">Email</TableHead>
                  <TableHead scope="col">Staff</TableHead>
                  <TableHead scope="col">Categories</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="whitespace-normal">
                      <p className="font-medium text-slate-900">{department.name}</p>
                      {department.description ? (
                        <p className="max-w-xs truncate text-xs text-slate-500" title={department.description}>
                          {department.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>{department.email ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{department.staffCount ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{department.categoryCount ?? "—"}</TableCell>
                    <TableCell>
                      <DepartmentActions department={department} onEdit={openEdit} onDelete={askDelete} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      <DepartmentFormDialog
        open={dialogOpen}
        department={editing}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditing(null);
        }}
      />
      <ConfirmActionDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.name}?` : "Delete department?"}
        description="This cannot be undone. Departments that still have categories or complaints cannot be deleted."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={remove.isPending}
        errorMessage={deleteError}
        onConfirm={() => void confirmDelete()}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}
