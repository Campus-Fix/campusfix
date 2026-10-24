import type { ComplaintStatus } from "@prisma/client";

/** Transition table - MASTER_PLAN.md Section 4. */
export const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED"],
  RESOLVED: ["IN_PROGRESS"], // reopen: admin/staff only, note required
  REJECTED: [], // final
};

export const OPEN_STATUSES: ComplaintStatus[] = ["SUBMITTED", "IN_PROGRESS"];

export function isOpenStatus(status: ComplaintStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function allowedTransitionsFrom(status: ComplaintStatus): ComplaintStatus[] {
  return [...TRANSITIONS[status]];
}

export function canTransition(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isReopen(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return from === "RESOLVED" && to === "IN_PROGRESS";
}

/** A note is required for REJECTED and for reopening (Section 4). */
export function isNoteRequired(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return to === "REJECTED" || isReopen(from, to);
}
