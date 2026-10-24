import { useState } from "react";
import { Link } from "react-router";
import { MapPin } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { ComplaintSummary } from "@/types";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { PriorityBadge } from "@/components/complaints/PriorityBadge";
import { StatusBadge } from "@/components/complaints/StatusBadge";
import { cn } from "@/lib/utils";

const TONES = [
  "from-indigo-500 via-indigo-600 to-violet-700",
  "from-sky-500 via-blue-600 to-indigo-800",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-cyan-500 via-sky-600 to-blue-700",
  "from-violet-500 via-purple-600 to-indigo-800",
  "from-emerald-500 via-teal-600 to-cyan-700",
  "from-fuchsia-500 via-violet-600 to-indigo-700",
  "from-rose-500 via-red-600 to-orange-600",
  "from-blue-500 via-indigo-600 to-slate-800",
  "from-teal-500 via-emerald-600 to-green-700",
  "from-orange-400 via-amber-500 to-yellow-600",
  "from-red-500 via-rose-600 to-fuchsia-700",
];

function toneFor(categoryId: number): string {
  return TONES[(Math.max(1, categoryId) - 1) % TONES.length];
}

export function ComplaintCard({
  complaint,
  layout = "grid",
}: {
  complaint: ComplaintSummary;
  layout?: "grid" | "row";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(complaint.thumbnailUrl) && !imageFailed;
  const tone = toneFor(complaint.category.id);

  if (layout === "row") {
    return (
      <Link
        to={`/app/complaints/${complaint.id}`}
        className="group flex overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      >
        <div className={cn("relative h-24 w-28 shrink-0 bg-gradient-to-br", tone)}>
          {showImage ? (
            <img
              src={complaint.thumbnailUrl ?? undefined}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageFailed(true)}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
          <CategoryIcon name={complaint.category.icon} className="absolute right-2 bottom-2 size-4 text-white" />
        </div>
        <div className="min-w-0 flex-1 bg-gradient-to-r from-white via-white to-slate-50 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">{complaint.title}</h3>
          <p className="truncate text-xs text-slate-500">
            <span className="font-mono">{complaint.ticketCode}</span>
            <span> · {complaint.location}</span>
            <span> · {timeAgo(complaint.createdAt)}</span>
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/app/complaints/${complaint.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className={cn("relative h-36 overflow-hidden bg-gradient-to-br", tone)}>
        {showImage ? (
          <img
            src={complaint.thumbnailUrl ?? undefined}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/15 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
          <span className="rounded-lg bg-white/15 p-1.5 backdrop-blur-sm">
            <CategoryIcon name={complaint.category.icon} className="size-4" />
          </span>
          <span className="text-xs font-medium drop-shadow">{complaint.category.name}</span>
        </div>
      </div>
      <div className="space-y-2 bg-gradient-to-b from-white to-slate-50 p-4">
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
          <MapPin className="size-3.5" />
          {complaint.location}
        </p>
        <p className="text-xs text-slate-400">{timeAgo(complaint.createdAt)}</p>
      </div>
    </Link>
  );
}
