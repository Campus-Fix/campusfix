import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function homePathForRole(role: string): string {
  if (role === "ADMIN") return "/app/dashboard";
  if (role === "STAFF") return "/app/queue";
  return "/app/complaints";
}
