import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { APP_TAGLINE } from "@/lib/constants";
import landingBg from "@/assets/landing-bg.jpg";
import type { ReactNode } from "react";

export function AuthSplit({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh overflow-hidden">
      <img
        src={landingBg}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover object-center blur-2xl"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/70 via-slate-900/50 to-amber-900/30" />
      <div className="pointer-events-none absolute -left-24 top-0 size-[32rem] rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-[28rem] rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative flex min-h-svh flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Logo light />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
          <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.45)] md:grid-cols-2">
            <aside className="relative min-h-[220px] overflow-hidden md:min-h-[540px]">
              <img
                src={landingBg}
                alt=""
                className="absolute inset-0 size-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/10" />
              <div className="relative flex h-full flex-col justify-end p-6 sm:p-8 md:p-10">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-200">
                  Campus operations
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-tight text-white md:mt-3 md:text-4xl">
                  Report.
                  <br />
                  Route.
                  <br />
                  Resolve.
                </h2>
                <p className="mt-3 hidden max-w-sm text-sm leading-relaxed text-white/75 md:block">
                  {APP_TAGLINE}
                </p>
              </div>
            </aside>

            <section className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
              {children}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
