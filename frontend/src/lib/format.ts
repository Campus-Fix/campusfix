import { differenceInHours, formatDistanceToNow, isPast, parseISO } from "date-fns";

export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function dueLabel(dueAt: string | null, isOverdue: boolean): string | null {
  if (!dueAt) return null;
  const due = parseISO(dueAt);
  const hours = Math.abs(differenceInHours(due, new Date()));
  if (isOverdue || isPast(due)) return `Overdue by ${hours}h`;
  return `Due in ${hours}h`;
}

export function confidencePct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
