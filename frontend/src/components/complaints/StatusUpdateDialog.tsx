import { useState } from "react";
import { toast } from "sonner";
import { STATUS_LABELS } from "@/lib/constants";
import type { ApiErrorBody, ComplaintStatus } from "@/types";
import { useChangeStatus } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StatusUpdateDialog({
  open,
  onOpenChange,
  complaintId,
  currentStatus,
  allowedTransitions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaintId: number;
  currentStatus: ComplaintStatus;
  allowedTransitions: ComplaintStatus[];
}) {
  const changeStatus = useChangeStatus(complaintId);
  const [status, setStatus] = useState<ComplaintStatus | "">(allowedTransitions[0] ?? "");
  const [note, setNote] = useState("");
  const noteRequired = status === "REJECTED" || (currentStatus === "RESOLVED" && status === "IN_PROGRESS");

  async function onSubmit() {
    if (!status) return;
    if (noteRequired && !note.trim()) {
      toast.error("A note is required for this status change");
      return;
    }
    try {
      await changeStatus.mutateAsync({ status, note: note.trim() || undefined });
      toast.success("Status updated");
      onOpenChange(false);
      setNote("");
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not update status");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>Current status is {STATUS_LABELS[currentStatus]}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>New status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {STATUS_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status-note">Note{noteRequired ? " (required)" : ""}</Label>
            <Textarea
              id="status-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What changed?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!status || changeStatus.isPending}>
            {changeStatus.isPending ? "Saving…" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
