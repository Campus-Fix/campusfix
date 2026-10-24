import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { dueLabel } from "@/lib/format";
import type { ComplaintStatus, TrackTimelineEntry } from "@/types";
import { useTrack } from "@/hooks/queries";
import { PriorityBadge } from "@/components/complaints/PriorityBadge";
import { QueryError } from "@/components/complaints/QueryError";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function stepDate(timeline: TrackTimelineEntry[], status: ComplaintStatus): string | null {
  const entry = timeline.find((item) => item.status === status);
  return entry ? format(new Date(entry.at), "dd MMM, h:mm a") : null;
}

export function TrackPage() {
  const { ticketCode } = useParams();
  const navigate = useNavigate();
  const query = useTrack(ticketCode);
  const [code, setCode] = useState(ticketCode ?? "");

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (code.trim()) navigate(`/track/${code.trim().toUpperCase()}`);
  }

  const data = query.data;
  const rejected = data?.status === "REJECTED";
  const steps: ComplaintStatus[] = rejected
    ? ["SUBMITTED", "IN_PROGRESS", "REJECTED"]
    : ["SUBMITTED", "IN_PROGRESS", "RESOLVED"];
  const reached = new Set(data?.timeline.map((item) => item.status));

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <form className="flex gap-2" onSubmit={onSearch}>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CMP-2026-000001"
            aria-label="Ticket code"
          />
          <Button type="submit">Track</Button>
        </form>

        {query.isLoading ? <Skeleton className="mt-8 h-64" /> : null}
        {query.isError ? (
          <div className="mt-8">
            <QueryError error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : null}

        {data ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-mono text-sm text-indigo-600">{data.ticketCode}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{data.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <PriorityBadge priority={data.priority} />
              <span>{data.category}</span>
              <span>·</span>
              <span>{data.department}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {dueLabel(data.dueAt, Boolean(data.dueAt && new Date(data.dueAt) < new Date() && data.status !== "RESOLVED" && data.status !== "REJECTED")) ?? "No SLA deadline"}
            </p>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {steps.map((status, index) => {
                const done = reached.has(status) || (status === "IN_PROGRESS" && (data.status === "RESOLVED" || data.status === "REJECTED"));
                const current = data.status === status;
                const colors = STATUS_COLORS[status];
                return (
                  <li key={status} className="text-center sm:text-left">
                    <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          current || done ? "text-white" : "bg-slate-100 text-slate-400",
                          (current || done) && (status === "REJECTED" ? "bg-rose-500" : status === "RESOLVED" ? "bg-emerald-500" : "bg-indigo-600"),
                        )}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className={cn("text-sm font-semibold", colors.text)}>{STATUS_LABELS[status]}</p>
                        <p className="text-xs text-slate-400">{stepDate(data.timeline, status) ?? "—"}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </main>
    </div>
  );
}
