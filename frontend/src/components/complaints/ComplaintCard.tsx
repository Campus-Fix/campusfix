import { Link } from "react-router";
import { MapPin } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { ComplaintSummary } from "@/types";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { PriorityBadge } from "@/components/complaints/PriorityBadge";
import { StatusBadge } from "@/components/complaints/StatusBadge";

export function ComplaintCard({ complaint }: { complaint: ComplaintSummary }) {
  return (
    <Link
      to={`/app/complaints/${complaint.id}`}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-indigo-200"
    >
      {complaint.thumbnailUrl ? (
        <img src={complaint.thumbnailUrl} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-slate-50 text-slate-300">
          <CategoryIcon name={complaint.category.icon} className="size-8" />
        </div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          {complaint.isOverdue ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Overdue</span>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{complaint.title}</h3>
        <p className="font-mono text-xs text-slate-500">{complaint.ticketCode}</p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <CategoryIcon name={complaint.category.icon} />
          {complaint.category.name}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="size-3.5" />
          {complaint.location}
        </p>
        <p className="text-xs text-slate-400">{timeAgo(complaint.createdAt)}</p>
      </div>
    </Link>
  );
}
