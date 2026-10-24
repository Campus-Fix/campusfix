import { Navigate } from "react-router";
import { homePathForRole, useAuth } from "@/hooks/useAuth";

export function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePathForRole(user?.role ?? "STUDENT")} replace />;
}
