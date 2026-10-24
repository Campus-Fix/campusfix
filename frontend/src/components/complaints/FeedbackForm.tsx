import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import type { ApiErrorBody } from "@/types";
import { useGiveFeedback } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function FeedbackForm({ complaintId }: { complaintId: number }) {
  const giveFeedback = useGiveFeedback(complaintId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  async function onSubmit() {
    if (rating < 1) {
      toast.error("Pick a star rating");
      return;
    }
    try {
      await giveFeedback.mutateAsync({ rating, comment: comment.trim() || undefined });
      toast.success("Thanks for the feedback");
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not submit feedback");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">How was the resolution?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onClick={() => setRating(value)}
            className="rounded-md p-1 hover:bg-amber-50"
          >
            <Star className={cn("size-5", value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="feedback-comment">Comment (optional)</Label>
        <Textarea
          id="feedback-comment"
          maxLength={500}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <Button type="button" onClick={onSubmit} disabled={giveFeedback.isPending}>
        {giveFeedback.isPending ? "Sending…" : "Give feedback"}
      </Button>
    </div>
  );
}
