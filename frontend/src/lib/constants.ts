import type { ComplaintStatus, Priority, Role } from "@/types";

export const APP_NAME = "CampusFix";
export const APP_TAGLINE = "Report in 30 seconds, routed instantly, tracked transparently.";

export const TOKEN_STORAGE_KEY = "campusfix_token";

/** Empty → safety banner says "contact campus security immediately" with no number. */
export const SECURITY_PHONE = (import.meta.env.VITE_SECURITY_PHONE ?? "").trim();

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export const STATUS_ORDER: ComplaintStatus[] = [
  "SUBMITTED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
];

/** Section 12.4 status colors: SUBMITTED blue, IN_PROGRESS amber, RESOLVED emerald, REJECTED rose. */
export const STATUS_COLORS: Record<
  ComplaintStatus,
  { badge: string; dot: string; text: string; ring: string }
> = {
  SUBMITTED: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  IN_PROGRESS: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    text: "text-amber-800",
    ring: "ring-amber-200",
  },
  RESOLVED: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  REJECTED: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
    ring: "ring-rose-200",
  },
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/** Section 12.4 priority colors: LOW slate, MEDIUM sky, HIGH orange, CRITICAL red + pulse. */
export const PRIORITY_COLORS: Record<
  Priority,
  { badge: string; dot: string; text: string; pulse: boolean }
> = {
  LOW: {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-700",
    pulse: false,
  },
  MEDIUM: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    text: "text-sky-700",
    pulse: false,
  },
  HIGH: {
    badge: "border-orange-200 bg-orange-50 text-orange-800",
    dot: "bg-orange-500",
    text: "text-orange-800",
    pulse: false,
  },
  CRITICAL: {
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
    text: "text-red-700",
    pulse: true,
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  ADMIN: "Admin",
};

export const ROLE_COLORS: Record<Role, string> = {
  STUDENT: "border-slate-200 bg-slate-50 text-slate-700",
  STAFF: "border-indigo-200 bg-indigo-50 text-indigo-700",
  ADMIN: "border-violet-200 bg-violet-50 text-violet-700",
};

/** Section 9.4 demo accounts — used by LoginPage quick-fill in step 3. */
export const DEMO_ACCOUNTS: {
  role: Role;
  label: string;
  email: string;
  password: string;
}[] = [
  { role: "ADMIN", label: "Admin", email: "admin@campusfix.edu", password: "Admin@123" },
  {
    role: "STAFF",
    label: "IT Staff",
    email: "it.staff@campusfix.edu",
    password: "Staff@123",
  },
  {
    role: "STAFF",
    label: "Facilities Staff",
    email: "facilities.staff@campusfix.edu",
    password: "Staff@123",
  },
  {
    role: "STAFF",
    label: "Housekeeping Staff",
    email: "housekeeping.staff@campusfix.edu",
    password: "Staff@123",
  },
  {
    role: "STUDENT",
    label: "Student",
    email: "student@campusfix.edu",
    password: "Student@123",
  },
];

export const AI_SURFACE =
  "relative rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/60 shadow-sm";

export const PAGE_MAX_WIDTH = "mx-auto w-full max-w-7xl";
