import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import type { ApiErrorBody } from "@/types";
import { AuthSplit } from "@/components/layout/AuthSplit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClassName = "h-11 rounded-xl border-transparent bg-slate-50 px-3.5";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/app/complaints", { replace: true });
    } catch (caught) {
      setError((caught as ApiErrorBody).message ?? "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit>
      <div className="mx-auto w-full max-w-[380px]">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create account</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Students can register themselves. Staff and admin accounts are created by campus admin.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              className={fieldClassName}
              placeholder="Ananya Rao"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className={fieldClassName}
              placeholder="Enter your email"
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
              autoComplete="new-password"
              className={fieldClassName}
              placeholder="At least 8 characters, with a letter and a number"
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
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="font-medium text-indigo-600 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
