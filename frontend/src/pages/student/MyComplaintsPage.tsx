import { Link } from "react-router";
import { useComplaints } from "@/hooks/queries";
import { useComplaintFilters } from "@/hooks/useComplaintFilters";
import { ComplaintCard } from "@/components/complaints/ComplaintCard";
import { EmptyState } from "@/components/complaints/EmptyState";
import { FilterBar } from "@/components/complaints/FilterBar";
import { QueryError } from "@/components/complaints/QueryError";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function MyComplaintsPage() {
  const { values, set, page } = useComplaintFilters();
  const query = useComplaints(values);
  const rows = query.data?.rows ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-5">
      <FilterBar values={values} onChange={set} />
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      ) : null}
      {query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState
          title="No complaints yet"
          description="Raise a ticket and AI will route it to the right department."
          action={
            <Button asChild>
              <Link to="/app/complaints/new">Raise complaint</Link>
            </Button>
          }
        />
      ) : null}
      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
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
