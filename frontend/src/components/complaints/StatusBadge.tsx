import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import type { ComplaintStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", colors.badge)}>
      <span className={cn("size-1.5 rounded-full", colors.dot)} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
