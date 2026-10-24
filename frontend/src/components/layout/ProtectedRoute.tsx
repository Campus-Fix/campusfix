import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import type { Role } from "@/types";

export function AuthBootScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm space-y-3 px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthBootScreen />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AuthBootScreen />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
