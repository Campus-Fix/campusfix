import { Link } from "react-router";
import { dueLabel, timeAgo } from "@/lib/format";
import { useComplaints } from "@/hooks/queries";
import { useComplaintFilters } from "@/hooks/useComplaintFilters";
import { EmptyState } from "@/components/complaints/EmptyState";
import { FilterBar } from "@/components/complaints/FilterBar";
import { PriorityBadge } from "@/components/complaints/PriorityBadge";
import { QueryError } from "@/components/complaints/QueryError";
import { StatusBadge } from "@/components/complaints/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function QueuePage() {
  const { values, set, page } = useComplaintFilters();
  const query = useComplaints({ ...values, limit: values.limit ?? "15" });
  const rows = query.data?.rows ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-5">
      <FilterBar values={values} onChange={set} showAssigned />
      {query.isLoading ? <Skeleton className="h-96" /> : null}
      {query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState title="Queue is clear" description="No complaints match these filters." />
      ) : null}
      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-mono text-xs">
                    <Link className="text-indigo-600 hover:underline" to={`/app/complaints/${complaint.id}`}>
                      {complaint.ticketCode}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate font-medium">
                    <Link className="hover:underline" to={`/app/complaints/${complaint.id}`}>
                      {complaint.title}
                    </Link>
                  </TableCell>
                  <TableCell>{complaint.category.name}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={complaint.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={complaint.status} />
                  </TableCell>
                  <TableCell>{complaint.assignedTo?.name ?? "—"}</TableCell>
                  <TableCell className="text-slate-500">{timeAgo(complaint.createdAt)}</TableCell>
                  <TableCell className={complaint.isOverdue ? "font-medium text-red-700" : "text-slate-500"}>
                    {dueLabel(complaint.dueAt, complaint.isOverdue) ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <p>
            Page {meta.page} of {meta.totalPages} · {meta.total} tickets
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => set("page", String(page - 1))}>
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => set("page", String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
