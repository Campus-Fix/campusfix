import { ArrowBigUp } from "lucide-react";
import { toast } from "sonner";
import type { ApiErrorBody } from "@/types";
import { useToggleUpvote } from "@/hooks/queries";
import { Button } from "@/components/ui/button";

export function UpvoteButton({
  id,
  upvoteCount,
  hasUpvoted,
  disabled,
}: {
  id: number;
  upvoteCount: number;
  hasUpvoted: boolean;
  disabled?: boolean;
}) {
  const toggle = useToggleUpvote();

  async function onClick() {
    try {
      await toggle.mutateAsync({ id, hasUpvoted });
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not update upvote");
    }
  }

  return (
    <Button type="button" variant={hasUpvoted ? "default" : "outline"} onClick={onClick} disabled={disabled || toggle.isPending}>
      <ArrowBigUp data-icon="inline-start" />
      {hasUpvoted ? "Upvoted" : "Upvote"} · {upvoteCount}
    </Button>
  );
}
