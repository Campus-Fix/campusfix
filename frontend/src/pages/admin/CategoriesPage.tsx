import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { EmptyState } from "@/components/complaints/EmptyState";
import { QueryError } from "@/components/complaints/QueryError";
import { useCategories } from "@/hooks/queries";
import type { Category } from "@/types";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { apiErrorMessage, useDeleteCategory } from "@/components/admin/admin-api";
import { CategoryFormDialog } from "@/components/admin/CategoryFormDialog";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function CategoryActions({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(category)}>
        Edit
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(category)} aria-label={`Delete ${category.name}`}>
        Delete
      </Button>
    </div>
  );
}

export function CategoriesPage() {
  const query = useCategories();
  const remove = useDeleteCategory();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    const rows = query.data ?? [];
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.description, row.department.name]
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

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  function askDelete(category: Category) {
    setDeleteError(null);
    setDeleting(category);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Category deleted");
      setDeleting(null);
      setDeleteError(null);
    } catch (error) {
      const message = apiErrorMessage(error, "Could not delete category");
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-500">
          Route each kind of complaint to a department and set how many hours the team has to resolve it.
        </p>
        {query.data ? (
          <p className="text-sm tabular-nums text-slate-500">
            {search.trim()
              ? `${filtered.length} of ${query.data.length}`
              : `${query.data.length} ${query.data.length === 1 ? "category" : "categories"}`}
          </p>
        ) : null}
      </div>

      <AdminToolbar
        id="category-search"
        search={search}
        onSearchChange={setSearch}
        placeholder="Search categories"
        addLabel="Add category"
        onAdd={openCreate}
      />

      {query.isPending ? <ListSkeleton label="Loading categories" /> : null}
      {!query.isPending && query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {!query.isPending && !query.isError && filtered.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No categories match your search" : "No categories yet"}
          description={
            search.trim()
              ? "Try a different name or department."
              : "Add a category so new complaints can be routed."
          }
          action={
            search.trim() ? (
              <Button type="button" variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button type="button" onClick={openCreate}>
                Add category
              </Button>
            )
          }
        />
      ) : null}
      {!query.isPending && !query.isError && filtered.length > 0 ? (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((category) => (
              <li key={category.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <CategoryIcon name={category.icon} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{category.name}</p>
                    {category.description ? <p className="mt-0.5 text-sm text-slate-500">{category.description}</p> : null}
                    <p className="mt-2 text-sm text-slate-600">{category.department.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {category.slaHours}h SLA
                      </Badge>
                      <span className="text-xs text-slate-500">{category.complaintCount ?? "—"} complaints</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <CategoryActions category={category} onEdit={openEdit} onDelete={askDelete} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col">Department</TableHead>
                  <TableHead scope="col">SLA</TableHead>
                  <TableHead scope="col">Complaints</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <CategoryIcon name={category.icon} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{category.name}</p>
                          {category.description ? (
                            <p className="max-w-xs truncate text-xs text-slate-500" title={category.description}>
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{category.department.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {category.slaHours}h
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{category.complaintCount ?? "—"}</TableCell>
                    <TableCell>
                      <CategoryActions category={category} onEdit={openEdit} onDelete={askDelete} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      <CategoryFormDialog
        open={dialogOpen}
        category={editing}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditing(null);
        }}
      />
      <ConfirmActionDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.name}?` : "Delete category?"}
        description="This cannot be undone. Categories that still have complaints cannot be deleted."
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
