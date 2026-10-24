import { useState } from "react";
import { toast } from "sonner";
import type { ApiErrorBody } from "@/types";
import { useAssignComplaint, useDepartmentStaff } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AssignDialog({
  open,
  onOpenChange,
  complaintId,
  departmentId,
  assignedToId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaintId: number;
  departmentId: number;
  assignedToId: number | null;
}) {
  const staff = useDepartmentStaff(departmentId);
  const assign = useAssignComplaint(complaintId);
  const [value, setValue] = useState(assignedToId ? String(assignedToId) : "none");

  async function onSubmit() {
    try {
      await assign.mutateAsync(value === "none" ? null : Number(value));
      toast.success(value === "none" ? "Unassigned" : "Assigned");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as ApiErrorBody).message ?? "Could not assign");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign staff</DialogTitle>
          <DialogDescription>Only active staff in this department can be assigned.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Staff member</Label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {(staff.data ?? []).map((person) => (
                <SelectItem key={person.id} value={String(person.id)}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={assign.isPending}>
            {assign.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
