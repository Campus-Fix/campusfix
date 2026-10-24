/**
 * Response shapes - MASTER_PLAN.md Section 10.2, verbatim.
 * The frontend's types/index.ts mirrors this file. Do not rename fields.
 */
import type { ComplaintStatus, Priority, Role } from "@prisma/client";
import type { Ref, PublicUser } from "../utils/mappers.js";

export type { Ref, PublicUser as User };

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  slaHours: number;
  department: Ref;
  complaintCount?: number;
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
  createdBy: Ref | null;
  assignedTo: Ref | null;
  isAnonymous: boolean;
  upvoteCount: number;
  hasUpvoted: boolean;
  isOverdue: boolean;
  dueAt: string | null;
  resolvedAt: string | null;
  thumbnailUrl: string | null;
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

export interface ComplaintPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  canAssign: boolean;
  canUpvote: boolean;
  canGiveFeedback: boolean;
  allowedTransitions: ComplaintStatus[];
}

export interface ComplaintDetail extends ComplaintSummary {
  description: string;
  images: { id: number; url: string }[];
  history: StatusHistoryEntry[];
  feedback: { rating: number; comment: string | null; createdAt: string } | null;
  ai: { categoryName: string | null; priority: Priority | null; confidence: number | null; reason: string | null } | null;
  permissions: ComplaintPermissions;
}

export interface AiSuggestion {
  category: Ref | null;
  department: Ref | null;
  priority: Priority;
  suggestedTitle: string;
  reason: string;
  confidence: number;
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
  similarity: number;
}

export interface TrackResponse {
  ticketCode: string;
  title: string;
  status: ComplaintStatus;
  priority: Priority;
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  timeline: { status: ComplaintStatus; at: string }[];
}
