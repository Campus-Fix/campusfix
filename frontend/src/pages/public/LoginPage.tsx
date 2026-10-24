import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { homePathForRole, useAuth } from "@/hooks/useAuth";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import type { ApiErrorBody } from "@/types";
import { AuthSplit } from "@/components/layout/AuthSplit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClassName = "h-11 rounded-xl border-transparent bg-slate-50 px-3.5";

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function fillDemo(nextEmail: string, nextPassword: string) {
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(email, password);
      navigate(from && from.startsWith("/app") ? from : homePathForRole(signedIn.role), { replace: true });
    } catch (caught) {
      setError((caught as ApiErrorBody).message ?? "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit>
      <div className="mx-auto w-full max-w-[380px]">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter your campus email and password to access your account.
        </p>

        {user ? (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="min-w-0 text-sm text-slate-600">
              Signed in as <span className="font-medium text-slate-900">{user.name}</span>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/app")}>
              Open app
            </Button>
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              className={fieldClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className={fieldClassName}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          Demo accounts
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account.email, account.password)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {account.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link className="font-medium text-indigo-600 hover:underline" to="/register">
            Sign up
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
