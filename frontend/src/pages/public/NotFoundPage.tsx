import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        That route is not part of CampusFix. Head back home or sign in to continue.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
