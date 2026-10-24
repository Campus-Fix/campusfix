// Section 10.2 shared response shapes — field names and enum strings must match exactly.

export type Role = "STUDENT" | "STAFF" | "ADMIN";
export type ComplaintStatus = "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Ref {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: Ref | null;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  slaHours: number;
  department: Ref;
  complaintCount?: number; // included on admin list
}

export interface Department {
  id: number;
  name: string;
  email: string | null;
  description: string | null;
  staffCount?: number;
  categoryCount?: number;
}

export interface ComplaintSummary {
  id: number;
  ticketCode: string;
  title: string;
  location: string;
  status: ComplaintStatus;
  priority: Priority;
  category: Ref & { icon: string | null };
  department: Ref;
  createdBy: Ref | null; // null when anonymous and viewer is not owner/admin, and always null in the campus feed
  assignedTo: Ref | null;
  isAnonymous: boolean;
  upvoteCount: number;
  hasUpvoted: boolean;
  isOverdue: boolean; // open && dueAt < now
  dueAt: string | null;
  resolvedAt: string | null;
  thumbnailUrl: string | null; // first image
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: number;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  note: string | null;
  changedBy: Ref & { role: Role };
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  description: string;
  images: { id: number; url: string }[];
  history: StatusHistoryEntry[]; // oldest first
  feedback: { rating: number; comment: string | null; createdAt: string } | null;
  ai: {
    categoryName: string | null;
    priority: Priority | null;
    confidence: number | null;
    reason: string | null;
  } | null;
  permissions: {
    // computed by backend for the current user, used to show/hide buttons
    canEdit: boolean;
    canDelete: boolean;
    canChangeStatus: boolean;
    canAssign: boolean;
    canUpvote: boolean;
    canGiveFeedback: boolean;
    allowedTransitions: ComplaintStatus[];
  };
}

export interface AiSuggestion {
  category: Ref | null; // matched to a real DB category
  department: Ref | null; // derived from category
  priority: Priority;
  suggestedTitle: string;
  reason: string; // one sentence, shown in the UI
  confidence: number; // 0..1
  isSafetyIssue: boolean;
  source: "ai" | "fallback";
}

export interface SimilarComplaint {
  id: number;
  ticketCode: string;
  title: string;
  location: string;
  status: ComplaintStatus;
  categoryName: string;
  upvoteCount: number;
  similarity: number; // 0..1
}

// --- Section 10.1 envelopes + Section 10.4 response shapes (not in 10.2) ---

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: { path: string; message: string }[];
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export interface AuthPayload {
  token: string;
  user: User;
}

export interface TrackTimelineEntry {
  status: ComplaintStatus;
  at: string;
}

export interface TrackResult {
  ticketCode: string;
  title: string;
  status: ComplaintStatus;
  priority: Priority;
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  timeline: TrackTimelineEntry[];
}

export interface AnalyticsSummary {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  overdue: number;
  avgResolutionHours: number;
  avgRating: number;
  last7Days: number;
}

export interface CategoryCount {
  id: number;
  name: string;
  icon: string | null;
  count: number;
}

export interface DepartmentPerformance {
  id: number;
  name: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
  avgResolutionHours: number;
}

export interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface AiAccuracy {
  aiSuggested: number;
  categoryKept: number;
  priorityKept: number;
  categoryAccuracy: number;
  priorityAccuracy: number;
}

export interface AiInsightItem {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
}

export interface AiInsights {
  generatedAt: string;
  headline: string;
  insights: AiInsightItem[];
  recommendations: string[];
  source: "ai" | "fallback";
}

export interface UpvoteResult {
  upvoteCount: number;
  hasUpvoted: boolean;
}
