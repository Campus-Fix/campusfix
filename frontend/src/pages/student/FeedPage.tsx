import { useFeed } from "@/hooks/queries";
import { useComplaintFilters } from "@/hooks/useComplaintFilters";
import { ComplaintCard } from "@/components/complaints/ComplaintCard";
import { EmptyState } from "@/components/complaints/EmptyState";
import { FilterBar } from "@/components/complaints/FilterBar";
import { QueryError } from "@/components/complaints/QueryError";
import { UpvoteButton } from "@/components/complaints/UpvoteButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function FeedPage() {
  const { values, set, page } = useComplaintFilters();
  const query = useFeed({ ...values, sort: values.sort ?? "upvotes", limit: values.limit ?? "12" });
  const rows = query.data?.rows ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-5">
      <FilterBar values={{ ...values, sort: values.sort ?? "upvotes" }} onChange={set} />
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
      ) : null}
      {query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState title="No open campus issues" description="When something is reported, it will show up here to upvote." />
      ) : null}
      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((complaint) => (
            <div key={complaint.id} className="space-y-2">
              <ComplaintCard complaint={complaint} />
              <UpvoteButton id={complaint.id} upvoteCount={complaint.upvoteCount} hasUpvoted={complaint.hasUpvoted} />
            </div>
          ))}
        </div>
      ) : null}
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <p>
            Page {meta.page} of {meta.totalPages}
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
