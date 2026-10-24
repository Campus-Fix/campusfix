import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ScanSearch, Sparkles, Ticket } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import landingBg from "@/assets/landing-bg.jpg";

const STEPS = [
  { icon: Ticket, title: "Report in 30 seconds", body: "Describe the issue, add a photo, and submit from your phone." },
  { icon: Sparkles, title: "AI routes it instantly", body: "Category, priority and department are suggested so the right team sees it." },
  { icon: ScanSearch, title: "Track it transparently", body: "Every ticket gets a code, an SLA and a public status stepper." },
];

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState("");

  function onTrack(event: FormEvent) {
    event.preventDefault();
    if (ticket.trim()) navigate(`/track/${ticket.trim().toUpperCase()}`);
  }

  return (
    <div className="bg-slate-50">
      <div className="relative min-h-[85vh] overflow-hidden">
        <img src={landingBg} alt="" className="absolute inset-0 size-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/25" />
        <div className="relative flex min-h-[85vh] flex-col">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              <Logo light />
            </Link>
            <div className="flex items-center gap-2">
              {user ? (
                <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                  <Link to="/app">Open app</Link>
                </Button>
              ) : (
                <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                  <Link to="/register">Register</Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-200">Campus operations</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{APP_NAME}</h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">{APP_TAGLINE}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90">
                <Link to={user ? "/app/complaints/new" : "/register"}>Raise a complaint</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-indigo-600">Step {index + 1}</p>
              <step.icon className="mt-3 size-6 text-indigo-600" />
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-xl px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Track your complaint</h2>
          <p className="mt-2 text-sm text-slate-500">Enter a ticket code. No login needed.</p>
          <form className="mt-6 flex flex-col gap-2 sm:flex-row" onSubmit={onTrack}>
            <Input
              value={ticket}
              onChange={(event) => setTicket(event.target.value)}
              placeholder="CMP-2026-000001"
              aria-label="Ticket code"
              className="h-11"
            />
            <Button type="submit" className="h-11">
              Track
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Ticket IDs and SLAs</h3>
            <p className="mt-1 text-sm text-slate-600">Every report gets a code and a deadline the department has to meet.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Duplicate detection</h3>
            <p className="mt-1 text-sm text-slate-600">AI flags similar open tickets so you can upvote instead of filing again.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Role-aware queues</h3>
            <p className="mt-1 text-sm text-slate-600">Students track, staff work the queue, admins see campus-wide analytics.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
