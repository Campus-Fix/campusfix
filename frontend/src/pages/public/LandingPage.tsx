import { Link } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import landingBg from "@/assets/landing-bg.jpg";

export function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="relative min-h-svh overflow-hidden">
      <img
        src={landingBg}
        alt=""
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/25" />
      <div className="relative flex min-h-svh flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
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
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-200">Campus operations</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{APP_NAME}</h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">{APP_TAGLINE}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90">
              <Link to="/register">Raise a complaint</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/login">Track an existing ticket</Link>
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
