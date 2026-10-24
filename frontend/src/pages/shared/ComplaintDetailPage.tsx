import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { Copy, MapPin, Sparkles } from "lucide-react";
import { AI_SURFACE } from "@/lib/constants";
import { confidencePct, dueLabel, timeAgo } from "@/lib/format";
import type { ApiErrorBody } from "@/types";
import { useComplaint, useDeleteComplaint } from "@/hooks/queries";
import { AssignDialog } from "@/components/complaints/AssignDialog";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { FeedbackForm } from "@/components/complaints/FeedbackForm";
import { PriorityBadge } from "@/components/complaints/PriorityBadge";
import { QueryError } from "@/components/complaints/QueryError";
import { StatusBadge } from "@/components/complaints/StatusBadge";
import { StatusTimeline } from "@/components/complaints/StatusTimeline";
import { StatusUpdateDialog } from "@/components/complaints/StatusUpdateDialog";
import { UpvoteButton } from "@/components/complaints/UpvoteButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useComplaint(id);
  const remove = useDeleteComplaint();
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  }

  const complaint = query.data;
  const due = dueLabel(complaint.dueAt, complaint.isOverdue);
  const keptCategory = complaint.ai?.categoryName === complaint.category.name;
  const keptPriority = complaint.ai?.priority === complaint.priority;

  async function copyCode() {
    await navigator.clipboard.writeText(complaint.ticketCode);
    toast.success("Ticket code copied");
  }

  async function onDelete() {
    try {
      await remove.mutateAsync(complaint.id);
      toast.success("Complaint deleted");
      navigate("/app/complaints");
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not delete");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="font-mono text-sm text-indigo-600 hover:underline" onClick={copyCode}>
              {complaint.ticketCode}
              <Copy className="ml-1 inline size-3.5" />
            </button>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            {complaint.isOverdue ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Overdue</span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{complaint.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{complaint.description}</p>
          {complaint.images.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {complaint.images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setLightbox(image.url)}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <img src={image.url} alt="" className="size-24 object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Location</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-slate-700">
                <MapPin className="size-3.5" />
                {complaint.location}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Category → department</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-slate-700">
                <CategoryIcon name={complaint.category.icon} />
                {complaint.category.name} → {complaint.department.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Created</dt>
              <dd className="mt-0.5 text-slate-700">
                {format(new Date(complaint.createdAt), "dd MMM yyyy, h:mm a")} · {timeAgo(complaint.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">SLA</dt>
              <dd className={`mt-0.5 ${complaint.isOverdue ? "font-medium text-red-700" : "text-slate-700"}`}>
                {due ?? "No deadline"}
              </dd>
            </div>
          </dl>
        </div>

        {complaint.ai ? (
          <div className={`${AI_SURFACE} p-4`}>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-800">
              <Sparkles className="size-4" />
              AI suggested {complaint.ai.categoryName} · {complaint.ai.priority}
              {complaint.ai.confidence != null ? ` (${confidencePct(complaint.ai.confidence)})` : ""}
            </p>
            {complaint.ai.reason ? <p className="mt-1 text-sm text-slate-600">{complaint.ai.reason}</p> : null}
            <p className="mt-2 text-xs text-slate-500">
              Category {keptCategory ? "kept" : "changed"} · Priority {keptPriority ? "kept" : "changed"}
            </p>
          </div>
        ) : null}

        {complaint.permissions.canGiveFeedback ? <FeedbackForm complaintId={complaint.id} /> : null}
        {complaint.feedback ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-semibold text-slate-900">Your feedback · {complaint.feedback.rating}/5</p>
            {complaint.feedback.comment ? <p className="mt-1 text-slate-600">{complaint.feedback.comment}</p> : null}
          </div>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Actions</p>
          <div className="mt-3 flex flex-col gap-2">
            {complaint.permissions.canEdit ? (
              <Button asChild variant="outline">
                <Link to={`/app/complaints/${complaint.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            {complaint.permissions.canChangeStatus ? (
              <Button type="button" variant="outline" onClick={() => setStatusOpen(true)}>
                Change status
              </Button>
            ) : null}
            {complaint.permissions.canAssign ? (
              <Button type="button" variant="outline" onClick={() => setAssignOpen(true)}>
                Assign
              </Button>
            ) : null}
            {complaint.permissions.canUpvote || complaint.hasUpvoted ? (
              <UpvoteButton
                id={complaint.id}
                upvoteCount={complaint.upvoteCount}
                hasUpvoted={complaint.hasUpvoted}
                disabled={!complaint.permissions.canUpvote && !complaint.hasUpvoted}
              />
            ) : (
              <p className="text-xs text-slate-500">{complaint.upvoteCount} upvotes</p>
            )}
            {complaint.permissions.canDelete ? (
              <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Assigned to</p>
          <p className="mt-1 text-sm text-slate-600">{complaint.assignedTo?.name ?? "Unassigned"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Timeline</p>
          <div className="mt-3">
            <StatusTimeline history={complaint.history} />
          </div>
        </div>
      </aside>

      <StatusUpdateDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        complaintId={complaint.id}
        currentStatus={complaint.status}
        allowedTransitions={complaint.permissions.allowedTransitions}
      />
      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        complaintId={complaint.id}
        departmentId={complaint.department.id}
        assignedToId={complaint.assignedTo?.id ?? null}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this complaint?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={onDelete} disabled={remove.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(lightbox)} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2" showCloseButton>
          {lightbox ? <img src={lightbox} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
