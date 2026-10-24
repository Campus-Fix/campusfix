import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants";
import type { Priority } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <Badge variant="outline" className={cn("gap-1.5", colors.badge)}>
      <span className={cn("size-1.5 rounded-full", colors.dot, colors.pulse && "animate-pulse")} />
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
