import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { AI_SURFACE } from "@/lib/constants";
import type { ApiErrorBody } from "@/types";
import { useAiInsights, useRefreshInsights } from "@/hooks/queries";
import { QueryError } from "@/components/complaints/QueryError";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SEVERITY: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AiInsightsPanel() {
  const query = useAiInsights();
  const refresh = useRefreshInsights();

  async function onRefresh() {
    try {
      await refresh.mutateAsync();
      toast.success("Insights regenerated");
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not regenerate");
    }
  }

  if (query.isLoading) return <Skeleton className="h-72" />;
  if (query.isError || !query.data) {
    return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  return (
    <div className={`${AI_SURFACE} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-violet-700">
            <Sparkles className="size-3.5" />
            AI insights
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{data.headline}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Generated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refresh.isPending}>
          {refresh.isPending ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        {data.insights.map((insight) => (
          <div key={insight.title} className={cn("rounded-xl border px-3 py-2.5", SEVERITY[insight.severity])}>
            <p className="text-sm font-medium">{insight.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{insight.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Recommendations</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
