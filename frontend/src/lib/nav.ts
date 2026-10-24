import {
  Building2,
  Inbox,
  LayoutDashboard,
  List,
  Plus,
  Rss,
  Tags,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard, roles: ["STAFF", "ADMIN"] },
  { label: "My Complaints", to: "/app/complaints", icon: Ticket, roles: ["STUDENT"] },
  { label: "All Complaints", to: "/app/complaints", icon: List, roles: ["ADMIN"] },
  { label: "Queue", to: "/app/queue", icon: Inbox, roles: ["STAFF", "ADMIN"] },
  { label: "Raise Complaint", to: "/app/complaints/new", icon: Plus, roles: ["STUDENT", "STAFF", "ADMIN"] },
  { label: "Campus Feed", to: "/app/feed", icon: Rss, roles: ["STUDENT", "STAFF", "ADMIN"] },
  { label: "Categories", to: "/app/admin/categories", icon: Tags, roles: ["ADMIN"] },
  { label: "Departments", to: "/app/admin/departments", icon: Building2, roles: ["ADMIN"] },
  { label: "Users", to: "/app/admin/users", icon: Users, roles: ["ADMIN"] },
  { label: "Profile", to: "/app/profile", icon: UserRound, roles: ["STUDENT", "STAFF", "ADMIN"] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function pageTitleFromPath(pathname: string, role?: Role): string {
  if (pathname === "/app/complaints/new") return "Raise complaint";
  if (/^\/app\/complaints\/\d+\/edit$/.test(pathname)) return "Edit complaint";
  if (/^\/app\/complaints\/\d+$/.test(pathname)) return "Complaint";
  if (pathname === "/app/complaints") return role === "ADMIN" ? "All complaints" : "My complaints";
  if (pathname === "/app/feed") return "Campus feed";
  if (pathname === "/app/queue") return "Queue";
  if (pathname === "/app/dashboard") return "Dashboard";
  if (pathname === "/app/admin/categories") return "Categories";
  if (pathname === "/app/admin/departments") return "Departments";
  if (pathname === "/app/admin/users") return "Users";
  if (pathname === "/app/profile") return "Profile";
  return "CampusFix";
}
