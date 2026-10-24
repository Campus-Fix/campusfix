import { format } from "date-fns";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import type { StatusHistoryEntry } from "@/types";
import { cn } from "@/lib/utils";

export function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  return (
    <ol className="space-y-4">
      {history.map((entry, index) => {
        const colors = STATUS_COLORS[entry.toStatus];
        const last = index === history.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("mt-1 size-2.5 rounded-full", colors.dot)} />
              {last ? null : <span className="mt-1 w-px flex-1 bg-slate-200" />}
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium text-slate-900">{STATUS_LABELS[entry.toStatus]}</p>
              <p className="text-xs text-slate-500">
                {entry.changedBy.name} · {format(new Date(entry.createdAt), "dd MMM, h:mm a")}
              </p>
              {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
