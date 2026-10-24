import { Button } from "@/components/ui/button";
import type { ApiErrorBody } from "@/types";

export function QueryError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message = (error as ApiErrorBody | undefined)?.message ?? "Something went wrong";
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
      <p className="text-sm text-rose-800">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
