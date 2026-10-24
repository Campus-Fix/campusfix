import type {
  AiAccuracy,
  AiInsights,
  AiSuggestion,
  AnalyticsSummary,
  ApiErrorCode,
  ApiSuccess,
  Category,
  CategoryCount,
  ComplaintDetail,
  ComplaintStatus,
  ComplaintSummary,
  Department,
  DepartmentPerformance,
  PaginationMeta,
  Priority,
  SimilarComplaint,
  TrackResult,
  TrendPoint,
  User,
} from "@/types";
import {
  findCategory,
  findDepartment,
  findUser,
  staffInDepartment,
  store,
  toPublicUser,
  type MockComplaint,
  type MockUser,
} from "@/mocks/data";

const OPEN: ComplaintStatus[] = ["SUBMITTED", "IN_PROGRESS"];

export class MockApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: { path: string; message: string }[];

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, meta?: PaginationMeta): ApiSuccess<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export function getBearerToken(header?: string): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function userFromToken(token: string | null): MockUser | null {
  if (!token?.startsWith("mock-token-")) return null;
  const id = Number(token.replace("mock-token-", ""));
  const user = findUser(id);
  if (!user || !user.isActive) return null;
  return user;
}

export function requireUser(token: string | null): MockUser {
  const user = userFromToken(token);
  if (!user) {
    throw new MockApiError(401, "UNAUTHORIZED", "Invalid email or password");
  }
  return user;
}

function requireRoles(user: MockUser, roles: MockUser["role"][]): MockUser {
  if (!roles.includes(user.role)) {
    throw new MockApiError(403, "FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isOverdue(complaint: MockComplaint, now = Date.now()): boolean {
  return OPEN.includes(complaint.status) && Boolean(complaint.dueAt) && new Date(complaint.dueAt!).getTime() < now;
}

function allowedTransitions(status: ComplaintStatus): ComplaintStatus[] {
  if (status === "SUBMITTED") return ["IN_PROGRESS", "REJECTED"];
  if (status === "IN_PROGRESS") return ["RESOLVED", "REJECTED"];
  if (status === "RESOLVED") return ["IN_PROGRESS"];
  return [];
}

function canSeeComplaint(user: MockUser, complaint: MockComplaint): boolean {
  if (user.role === "ADMIN") return true;
  if (complaint.createdById === user.id) return true;
  if (user.role === "STAFF" && user.departmentId === complaint.departmentId) return true;
  return false;
}

function permissions(user: MockUser, complaint: MockComplaint): ComplaintDetail["permissions"] {
  const owner = complaint.createdById === user.id;
  const staffSameDept = user.role === "STAFF" && user.departmentId === complaint.departmentId;
  const admin = user.role === "ADMIN";
  const submitted = complaint.status === "SUBMITTED";
  const canManage = admin || staffSameDept;
  return {
    canEdit: admin || (owner && submitted),
    canDelete: admin || (owner && submitted),
    canChangeStatus: canManage,
    canAssign: canManage,
    canUpvote: !owner && OPEN.includes(complaint.status),
    canGiveFeedback: owner && complaint.status === "RESOLVED" && !complaint.feedback,
    allowedTransitions: canManage ? allowedTransitions(complaint.status) : [],
  };
}

function toSummary(
  complaint: MockComplaint,
  viewer: MockUser | null,
  opts?: { hideCreator?: boolean },
): ComplaintSummary {
  const category = findCategory(complaint.categoryId);
  const department = findDepartment(complaint.departmentId);
  const creator = findUser(complaint.createdById);
  const assignee = complaint.assignedToId ? findUser(complaint.assignedToId) : undefined;
  const upvoteCount = store.upvotes.filter((row) => row.complaintId === complaint.id).length;
  const hideCreator =
    opts?.hideCreator ||
    (complaint.isAnonymous && viewer?.id !== complaint.createdById && viewer?.role !== "ADMIN");

  return {
    id: complaint.id,
    ticketCode: complaint.ticketCode,
    title: complaint.title,
    location: complaint.location,
    status: complaint.status,
    priority: complaint.priority,
    category: {
      id: category?.id ?? complaint.categoryId,
      name: category?.name ?? "Unknown",
      icon: category?.icon ?? null,
    },
    department: { id: department?.id ?? complaint.departmentId, name: department?.name ?? "Unknown" },
    createdBy: hideCreator || !creator ? null : { id: creator.id, name: creator.name },
    assignedTo: assignee ? { id: assignee.id, name: assignee.name } : null,
    isAnonymous: complaint.isAnonymous,
    upvoteCount,
    hasUpvoted: Boolean(viewer && store.upvotes.some((row) => row.complaintId === complaint.id && row.userId === viewer.id)),
    isOverdue: isOverdue(complaint),
    dueAt: complaint.dueAt,
    resolvedAt: complaint.resolvedAt,
    thumbnailUrl: complaint.images[0]?.url ?? null,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

function toDetail(complaint: MockComplaint, viewer: MockUser): ComplaintDetail {
  return {
    ...toSummary(complaint, viewer),
    description: complaint.description,
    images: complaint.images.map((image) => ({ id: image.id, url: image.url })),
    history: complaint.history,
    feedback: complaint.feedback
      ? {
          rating: complaint.feedback.rating,
          comment: complaint.feedback.comment,
          createdAt: complaint.feedback.createdAt,
        }
      : null,
    ai: complaint.aiCategoryName
      ? {
          categoryName: complaint.aiCategoryName,
          priority: complaint.aiPriority,
          confidence: complaint.aiConfidence,
          reason: complaint.aiReason,
        }
      : null,
    permissions: permissions(viewer, complaint),
  };
}

function paginate<T>(items: T[], page: number, limit: number): { rows: T[]; meta: PaginationMeta } {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  return {
    rows: items.slice(start, start + safeLimit),
    meta: { page: safePage, limit: safeLimit, total, totalPages },
  };
}

function sortComplaints(items: MockComplaint[], sort: string | null): MockComplaint[] {
  const copy = [...items];
  if (sort === "oldest") {
    copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (sort === "priority") {
    const rank: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    copy.sort((a, b) => rank[a.priority] - rank[b.priority] || b.createdAt.localeCompare(a.createdAt));
  } else if (sort === "upvotes") {
    copy.sort((a, b) => {
      const au = store.upvotes.filter((row) => row.complaintId === a.id).length;
      const bu = store.upvotes.filter((row) => row.complaintId === b.id).length;
      return bu - au;
    });
  } else if (sort === "due") {
    copy.sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  } else {
    copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return copy;
}

function applyComplaintFilters(
  items: MockComplaint[],
  searchParams: URLSearchParams,
  viewer: MockUser,
  opts?: { ignoreAssigned?: boolean },
): MockComplaint[] {
  let rows = [...items];
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const categoryId = parseIntParam(searchParams.get("categoryId"));
  const departmentId = parseIntParam(searchParams.get("departmentId"));
  const assignedTo = searchParams.get("assignedTo");
  const overdue = searchParams.get("overdue");
  const search = searchParams.get("search")?.trim().toLowerCase();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (status) {
    const allowed = status.split(",") as ComplaintStatus[];
    rows = rows.filter((row) => allowed.includes(row.status));
  }
  if (priority) {
    const allowed = priority.split(",") as Priority[];
    rows = rows.filter((row) => allowed.includes(row.priority));
  }
  if (categoryId) rows = rows.filter((row) => row.categoryId === categoryId);
  if (departmentId && viewer.role === "ADMIN") {
    rows = rows.filter((row) => row.departmentId === departmentId);
  }
  if (!opts?.ignoreAssigned && assignedTo && (viewer.role === "STAFF" || viewer.role === "ADMIN")) {
    if (assignedTo === "me") rows = rows.filter((row) => row.assignedToId === viewer.id);
    else if (assignedTo === "unassigned") rows = rows.filter((row) => row.assignedToId === null);
    else {
      const id = Number(assignedTo);
      if (Number.isFinite(id)) rows = rows.filter((row) => row.assignedToId === id);
    }
  }
  if (overdue === "true") rows = rows.filter((row) => isOverdue(row));
  if (search) {
    rows = rows.filter((row) => {
      const category = findCategory(row.categoryId);
      return [row.ticketCode, row.title, row.description, row.location, category?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }
  if (from) rows = rows.filter((row) => row.createdAt.slice(0, 10) >= from);
  if (to) rows = rows.filter((row) => row.createdAt.slice(0, 10) <= to);
  return rows;
}

function nextTicketCode(id: number): string {
  return `CMP-2026-${String(id).padStart(6, "0")}`;
}

function keywordAnalyze(input: {
  description: string;
  title?: string;
  location?: string;
}): AiSuggestion {
  const text = `${input.title ?? ""} ${input.description} ${input.location ?? ""}`.toLowerCase();
  const rules: { pattern: RegExp; categoryId: number }[] = [
    { pattern: /fire|spark|shock|harass|unsafe|theft|injur|smoke|gas/, categoryId: 12 },
    { pattern: /wifi|wi-fi|internet|network|router|moodle/, categoryId: 1 },
    { pattern: /projector|lab pc|computer|hdmi|boot/, categoryId: 2 },
    { pattern: /fan|light|switch|power|socket|regulator|tube/, categoryId: 3 },
    { pattern: /water|leak|tap|pipe|cooler/, categoryId: 4 },
    { pattern: /chair|desk|bench|furniture|door/, categoryId: 5 },
    { pattern: /classroom|whiteboard|ac |air conditioner/, categoryId: 6 },
    { pattern: /dirty|garbage|dustbin|smell|overflow/, categoryId: 7 },
    { pattern: /toilet|washroom|restroom/, categoryId: 8 },
    { pattern: /bus|driver|route|parking/, categoryId: 9 },
    { pattern: /hostel|bed frame|room 1/, categoryId: 10 },
    { pattern: /food|mess|canteen|samosa|dal/, categoryId: 11 },
  ];

  const match = rules.find((rule) => rule.pattern.test(text));
  const category = match ? findCategory(match.categoryId) : findCategory(1);
  const isSafetyIssue = /fire|spark|shock|harass|unsafe|theft|injur|smoke|gas/.test(text);
  let priority: Priority = "MEDIUM";
  if (isSafetyIssue) priority = "CRITICAL";
  else if (/not working|down|no water|no power|completely|since morning/.test(text)) priority = "HIGH";
  else if (/cosmetic|paint|squeak|request|suggestion/.test(text)) priority = "LOW";

  const demoLike = /wifi|wi-fi|internet/.test(text) && /block c/.test(text);
  const source = demoLike || isSafetyIssue || Boolean(match) ? "ai" : "fallback";
  const titleFromText = input.description.replace(/\s+/g, " ").trim().slice(0, 70);
  const suggestedTitle = demoLike
    ? "Wi-Fi down on Block C 2nd floor"
    : input.title?.trim() || titleFromText;

  return {
    category: category ? { id: category.id, name: category.name } : null,
    department: category ? { id: category.department.id, name: category.department.name } : null,
    priority: demoLike ? "HIGH" : priority,
    suggestedTitle,
    reason: demoLike
      ? "Network outage affecting a shared study area used by many students."
      : isSafetyIssue
        ? "This mentions an immediate safety risk and should be treated as critical."
        : source === "fallback"
          ? "Suggested using keyword matching."
          : `Looks like a ${category?.name ?? "campus"} issue based on the description.`,
    confidence: demoLike ? 0.93 : isSafetyIssue ? 0.96 : source === "fallback" ? 0.4 : 0.84,
    isSafetyIssue,
    source,
  };
}

function readJson(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (body instanceof FormData) {
    const record: Record<string, unknown> = {};
    body.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (typeof body === "object") return body as Record<string, unknown>;
  return {};
}

function formString(body: FormData | Record<string, unknown>, key: string): string {
  const value = body instanceof FormData ? body.get(key) : body[key];
  return typeof value === "string" ? value : "";
}

export interface MockRequest {
  method: string;
  path: string;
  searchParams: URLSearchParams;
  body: unknown;
  token: string | null;
}

export interface MockResult {
  status: number;
  data: unknown;
}

export function handleMock(request: MockRequest): MockResult {
  const { method, path, searchParams, body, token } = request;
  const parts = path.split("/").filter(Boolean);

  if (method === "GET" && path === "/health") {
    return { status: 200, data: ok({ ok: true }) };
  }

  if (method === "POST" && path === "/auth/register") {
    const payload = readJson(body);
    const name = String(payload.name ?? "").trim();
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const details: { path: string; message: string }[] = [];
    if (name.length < 2 || name.length > 80) details.push({ path: "name", message: "Name must be 2–80 characters" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push({ path: "email", message: "Enter a valid email" });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      details.push({ path: "password", message: "Password must be at least 8 characters with a letter and a number" });
    }
    if (details.length) throw new MockApiError(400, "VALIDATION_ERROR", details[0].message, details);
    if (store.users.some((user) => user.email === email)) {
      throw new MockApiError(409, "CONFLICT", "An account with this email already exists");
    }
    const user: MockUser = {
      id: store.nextUserId,
      name,
      email,
      password,
      role: "STUDENT",
      department: null,
      departmentId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    store.nextUserId += 1;
    store.users.push(user);
    return { status: 201, data: ok({ token: `mock-token-${user.id}`, user: toPublicUser(user) }) };
  }

  if (method === "POST" && path === "/auth/login") {
    const payload = readJson(body);
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const user = store.users.find((row) => row.email === email);
    if (!user || user.password !== password) {
      throw new MockApiError(401, "UNAUTHORIZED", "Invalid email or password");
    }
    if (!user.isActive) throw new MockApiError(403, "FORBIDDEN", "This account is inactive");
    return { status: 200, data: ok({ token: `mock-token-${user.id}`, user: toPublicUser(user) }) };
  }

  if (method === "GET" && path === "/auth/me") {
    return { status: 200, data: ok({ user: toPublicUser(requireUser(token)) }) };
  }

  if (method === "PUT" && path === "/auth/me") {
    const user = requireUser(token);
    const payload = readJson(body);
    if (typeof payload.name === "string") user.name = payload.name;
    if (payload.newPassword) {
      if (payload.currentPassword !== user.password) {
        throw new MockApiError(400, "VALIDATION_ERROR", "Current password is incorrect");
      }
      user.password = String(payload.newPassword);
    }
    return { status: 200, data: ok({ user: toPublicUser(user) }) };
  }

  if (method === "GET" && path === "/complaints/feed") {
    const user = requireUser(token);
    const rows = sortComplaints(
      applyComplaintFilters(
        store.complaints.filter((row) => OPEN.includes(row.status)),
        searchParams,
        user,
        { ignoreAssigned: true },
      ),
      searchParams.get("sort") ?? "upvotes",
    );
    const page = paginate(rows, Number(searchParams.get("page") ?? 1), Number(searchParams.get("limit") ?? 10));
    return {
      status: 200,
      data: ok(
        page.rows.map((row) => toSummary(row, user, { hideCreator: true })),
        page.meta,
      ),
    };
  }

  if (method === "GET" && path === "/complaints") {
    const user = requireUser(token);
    let visible = store.complaints;
    if (user.role === "STUDENT") visible = visible.filter((row) => row.createdById === user.id);
    if (user.role === "STAFF") visible = visible.filter((row) => row.departmentId === user.departmentId);
    const rows = sortComplaints(
      applyComplaintFilters(visible, searchParams, user),
      searchParams.get("sort"),
    );
    const page = paginate(rows, Number(searchParams.get("page") ?? 1), Number(searchParams.get("limit") ?? 10));
    return { status: 200, data: ok(page.rows.map((row) => toSummary(row, user)), page.meta) };
  }

  if (method === "POST" && path === "/complaints") {
    const user = requireUser(token);
    const form = body instanceof FormData ? body : readJson(body);
    const title = formString(form, "title").trim();
    const description = formString(form, "description").trim();
    const location = formString(form, "location").trim();
    const categoryId = Number(formString(form, "categoryId"));
    const priority = (formString(form, "priority") || "MEDIUM") as Priority;
    const isAnonymous = formString(form, "isAnonymous") === "true";
    const details: { path: string; message: string }[] = [];
    if (title.length < 5 || title.length > 120) details.push({ path: "title", message: "Title must be 5–120 characters" });
    if (description.length < 10 || description.length > 2000) {
      details.push({ path: "description", message: "Description must be at least 10 characters" });
    }
    if (location.length < 2 || location.length > 120) details.push({ path: "location", message: "Location must be 2–120 characters" });
    const category = findCategory(categoryId);
    if (!category) details.push({ path: "categoryId", message: "Category not found" });
    if (details.length) throw new MockApiError(400, "VALIDATION_ERROR", details[0].message, details);

    const now = new Date();
    const complaint: MockComplaint = {
      id: store.nextComplaintId,
      ticketCode: nextTicketCode(store.nextComplaintId),
      title,
      description,
      location,
      priority,
      status: "SUBMITTED",
      isAnonymous,
      categoryId: category!.id,
      departmentId: category!.department.id,
      createdById: user.id,
      assignedToId: null,
      aiCategoryName: formString(form, "aiCategoryName") || null,
      aiPriority: (formString(form, "aiPriority") as Priority) || null,
      aiConfidence: formString(form, "aiConfidence") ? Number(formString(form, "aiConfidence")) : null,
      aiReason: formString(form, "aiReason") || null,
      dueAt: new Date(now.getTime() + category!.slaHours * 3600 * 1000).toISOString(),
      resolvedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      images: [],
      history: [
        {
          id: store.nextHistoryId,
          fromStatus: null,
          toStatus: "SUBMITTED",
          note: "Complaint submitted",
          changedBy: { id: user.id, name: user.name, role: user.role },
          createdAt: now.toISOString(),
        },
      ],
      feedback: null,
    };
    store.nextComplaintId += 1;
    store.nextHistoryId += 1;

    const files = body instanceof FormData ? body.getAll("images") : [];
    files.slice(0, 3).forEach((file) => {
      if (file instanceof File) {
        complaint.images.push({
          id: store.nextImageId,
          url: URL.createObjectURL(file),
          path: file.name,
        });
        store.nextImageId += 1;
      }
    });

    store.complaints.unshift(complaint);
    return { status: 201, data: ok(toDetail(complaint, user)) };
  }

  if (parts[0] === "complaints" && parts[1] && parts.length >= 2) {
    const user = requireUser(token);
    const id = Number(parts[1]);
    const complaint = store.complaints.find((row) => row.id === id);
    if (!complaint || !canSeeComplaint(user, complaint)) {
      throw new MockApiError(404, "NOT_FOUND", "Complaint not found");
    }

    if (method === "GET" && parts.length === 2) {
      return { status: 200, data: ok(toDetail(complaint, user)) };
    }

    if (method === "PUT" && parts.length === 2) {
      if (!permissions(user, complaint).canEdit) {
        throw new MockApiError(422, "INVALID_TRANSITION", "This complaint can no longer be edited");
      }
      const payload = readJson(body);
      if (typeof payload.title === "string") complaint.title = payload.title;
      if (typeof payload.description === "string") complaint.description = payload.description;
      if (typeof payload.location === "string") complaint.location = payload.location;
      if (typeof payload.priority === "string") complaint.priority = payload.priority as Priority;
      if (typeof payload.isAnonymous === "boolean") complaint.isAnonymous = payload.isAnonymous;
      if (typeof payload.categoryId === "number") {
        const category = findCategory(payload.categoryId);
        if (!category) throw new MockApiError(400, "VALIDATION_ERROR", "Category not found");
        complaint.categoryId = category.id;
        complaint.departmentId = category.department.id;
        complaint.dueAt = new Date(new Date(complaint.createdAt).getTime() + category.slaHours * 3600 * 1000).toISOString();
      }
      complaint.updatedAt = new Date().toISOString();
      return { status: 200, data: ok(toDetail(complaint, user)) };
    }

    if (method === "DELETE" && parts.length === 2) {
      if (!permissions(user, complaint).canDelete) {
        throw new MockApiError(422, "INVALID_TRANSITION", "This complaint can no longer be deleted");
      }
      store.complaints = store.complaints.filter((row) => row.id !== complaint.id);
      store.upvotes = store.upvotes.filter((row) => row.complaintId !== complaint.id);
      return { status: 204, data: undefined };
    }

    if (method === "PATCH" && parts[2] === "status") {
      if (!permissions(user, complaint).canChangeStatus) {
        throw new MockApiError(403, "FORBIDDEN", "You cannot change this complaint");
      }
      const payload = readJson(body);
      const next = payload.status as ComplaintStatus;
      const note = typeof payload.note === "string" ? payload.note.trim() : "";
      if (!allowedTransitions(complaint.status).includes(next)) {
        throw new MockApiError(422, "INVALID_TRANSITION", "This status change is not allowed");
      }
      if ((next === "REJECTED" || (complaint.status === "RESOLVED" && next === "IN_PROGRESS")) && !note) {
        throw new MockApiError(400, "VALIDATION_ERROR", "A note is required for this status change");
      }
      const fromStatus = complaint.status;
      complaint.status = next;
      complaint.updatedAt = new Date().toISOString();
      complaint.resolvedAt = next === "RESOLVED" ? complaint.updatedAt : next === "IN_PROGRESS" ? null : complaint.resolvedAt;
      complaint.history.push({
        id: store.nextHistoryId,
        fromStatus,
        toStatus: next,
        note: note || null,
        changedBy: { id: user.id, name: user.name, role: user.role },
        createdAt: complaint.updatedAt,
      });
      store.nextHistoryId += 1;
      return { status: 200, data: ok(toDetail(complaint, user)) };
    }

    if (method === "PATCH" && parts[2] === "assign") {
      if (!permissions(user, complaint).canAssign) {
        throw new MockApiError(403, "FORBIDDEN", "You cannot assign this complaint");
      }
      const payload = readJson(body);
      const assignedToId = payload.assignedToId === null ? null : Number(payload.assignedToId);
      if (assignedToId !== null) {
        const assignee = findUser(assignedToId);
        if (!assignee || assignee.role !== "STAFF" || !assignee.isActive || assignee.departmentId !== complaint.departmentId) {
          throw new MockApiError(422, "INVALID_TRANSITION", "Assignee must be active staff in this department");
        }
        complaint.assignedToId = assignee.id;
        const fromStatus = complaint.status;
        if (complaint.status === "SUBMITTED") complaint.status = "IN_PROGRESS";
        complaint.updatedAt = new Date().toISOString();
        complaint.history.push({
          id: store.nextHistoryId,
          fromStatus,
          toStatus: complaint.status,
          note: `Assigned to ${assignee.name}`,
          changedBy: { id: user.id, name: user.name, role: user.role },
          createdAt: complaint.updatedAt,
        });
        store.nextHistoryId += 1;
      } else {
        complaint.assignedToId = null;
        complaint.updatedAt = new Date().toISOString();
      }
      return { status: 200, data: ok(toDetail(complaint, user)) };
    }

    if (parts[2] === "upvote" && parts.length === 3) {
      if (method === "POST") {
        if (complaint.createdById === user.id) {
          throw new MockApiError(422, "INVALID_TRANSITION", "You cannot upvote your own complaint");
        }
        if (!OPEN.includes(complaint.status)) {
          throw new MockApiError(422, "INVALID_TRANSITION", "Closed complaints cannot be upvoted");
        }
        if (store.upvotes.some((row) => row.complaintId === complaint.id && row.userId === user.id)) {
          throw new MockApiError(409, "CONFLICT", "You have already upvoted this complaint");
        }
        store.upvotes.push({ complaintId: complaint.id, userId: user.id });
      } else if (method === "DELETE") {
        store.upvotes = store.upvotes.filter((row) => !(row.complaintId === complaint.id && row.userId === user.id));
      }
      const upvoteCount = store.upvotes.filter((row) => row.complaintId === complaint.id).length;
      const hasUpvoted = store.upvotes.some((row) => row.complaintId === complaint.id && row.userId === user.id);
      return { status: 200, data: ok({ upvoteCount, hasUpvoted }) };
    }

    if (method === "POST" && parts[2] === "feedback") {
      if (complaint.createdById !== user.id) throw new MockApiError(403, "FORBIDDEN", "Only the owner can give feedback");
      if (complaint.status !== "RESOLVED") {
        throw new MockApiError(422, "INVALID_TRANSITION", "Feedback is only allowed after the complaint is resolved");
      }
      if (complaint.feedback) throw new MockApiError(409, "CONFLICT", "Feedback has already been submitted");
      const payload = readJson(body);
      const rating = Number(payload.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new MockApiError(400, "VALIDATION_ERROR", "Rating must be between 1 and 5");
      }
      complaint.feedback = {
        rating,
        comment: typeof payload.comment === "string" ? payload.comment.slice(0, 500) : null,
        createdAt: new Date().toISOString(),
        userId: user.id,
      };
      return { status: 201, data: ok({ feedback: complaint.feedback }) };
    }
  }

  if (method === "GET" && parts[0] === "track" && parts[1]) {
    const code = decodeURIComponent(parts[1]).toUpperCase();
    const complaint = store.complaints.find((row) => row.ticketCode.toUpperCase() === code);
    if (!complaint) throw new MockApiError(404, "NOT_FOUND", "Ticket not found");
    const category = findCategory(complaint.categoryId);
    const department = findDepartment(complaint.departmentId);
    const data: TrackResult = {
      ticketCode: complaint.ticketCode,
      title: complaint.title,
      status: complaint.status,
      priority: complaint.priority,
      category: category?.name ?? "Unknown",
      department: department?.name ?? "Unknown",
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      dueAt: complaint.dueAt,
      timeline: complaint.history.map((entry) => ({ status: entry.toStatus, at: entry.createdAt })),
    };
    return { status: 200, data: ok(data) };
  }

  if (parts[0] === "categories") {
    if (method === "GET" && parts.length === 1) {
      const user = token ? userFromToken(token) : null;
      const rows: Category[] = store.categories.map((category) => ({
        ...category,
        complaintCount:
          user?.role === "ADMIN"
            ? store.complaints.filter((row) => row.categoryId === category.id).length
            : undefined,
      }));
      return { status: 200, data: ok(rows) };
    }
    const user = requireRoles(requireUser(token), ["ADMIN"]);
    if (method === "POST" && parts.length === 1) {
      const payload = readJson(body);
      const name = String(payload.name ?? "").trim();
      if (store.categories.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
        throw new MockApiError(409, "CONFLICT", "A category with this name already exists");
      }
      const department = findDepartment(Number(payload.departmentId));
      if (!department) throw new MockApiError(400, "VALIDATION_ERROR", "Department not found");
      const category: Category = {
        id: store.nextCategoryId,
        name,
        description: typeof payload.description === "string" ? payload.description : null,
        icon: typeof payload.icon === "string" ? payload.icon : null,
        slaHours: Number(payload.slaHours ?? 48),
        department: { id: department.id, name: department.name },
      };
      store.nextCategoryId += 1;
      store.categories.push(category);
      void user;
      return { status: 201, data: ok(category) };
    }
    const id = Number(parts[1]);
    const category = store.categories.find((row) => row.id === id);
    if (!category) throw new MockApiError(404, "NOT_FOUND", "Category not found");
    if (method === "PUT") {
      const payload = readJson(body);
      if (typeof payload.name === "string") {
        const name = payload.name;
        if (store.categories.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
          throw new MockApiError(409, "CONFLICT", "A category with this name already exists");
        }
        category.name = name;
      }
      if ("description" in payload) category.description = (payload.description as string) ?? null;
      if ("icon" in payload) category.icon = (payload.icon as string) ?? null;
      if (payload.slaHours) category.slaHours = Number(payload.slaHours);
      if (payload.departmentId) {
        const department = findDepartment(Number(payload.departmentId));
        if (!department) throw new MockApiError(400, "VALIDATION_ERROR", "Department not found");
        category.department = { id: department.id, name: department.name };
      }
      return { status: 200, data: ok(category) };
    }
    if (method === "DELETE") {
      if (store.complaints.some((row) => row.categoryId === id)) {
        throw new MockApiError(409, "CONFLICT", "Cannot delete this category because complaints still reference it");
      }
      store.categories = store.categories.filter((row) => row.id !== id);
      return { status: 204, data: undefined };
    }
  }

  if (parts[0] === "departments") {
    if (method === "GET" && parts.length === 1) {
      const rows: Department[] = store.departments.map((department) => ({
        ...department,
        staffCount: store.users.filter((user) => user.departmentId === department.id && user.role === "STAFF").length,
        categoryCount: store.categories.filter((category) => category.department.id === department.id).length,
      }));
      return { status: 200, data: ok(rows) };
    }
    if (method === "GET" && parts[2] === "staff") {
      const user = requireUser(token);
      const departmentId = Number(parts[1]);
      if (user.role === "STAFF" && user.departmentId !== departmentId) {
        throw new MockApiError(403, "FORBIDDEN", "You can only view staff in your department");
      }
      return {
        status: 200,
        data: ok(staffInDepartment(departmentId).map((row) => ({ id: row.id, name: row.name }))),
      };
    }
    requireRoles(requireUser(token), ["ADMIN"]);
    if (method === "POST" && parts.length === 1) {
      const payload = readJson(body);
      const name = String(payload.name ?? "").trim();
      if (store.departments.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
        throw new MockApiError(409, "CONFLICT", "A department with this name already exists");
      }
      const department: Department = {
        id: store.nextDepartmentId,
        name,
        email: typeof payload.email === "string" ? payload.email : null,
        description: typeof payload.description === "string" ? payload.description : null,
      };
      store.nextDepartmentId += 1;
      store.departments.push(department);
      return { status: 201, data: ok(department) };
    }
    const id = Number(parts[1]);
    const department = store.departments.find((row) => row.id === id);
    if (!department) throw new MockApiError(404, "NOT_FOUND", "Department not found");
    if (method === "PUT") {
      const payload = readJson(body);
      if (typeof payload.name === "string") {
        const name = payload.name;
        if (store.departments.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
          throw new MockApiError(409, "CONFLICT", "A department with this name already exists");
        }
        department.name = name;
      }
      if ("email" in payload) department.email = (payload.email as string) ?? null;
      if ("description" in payload) department.description = (payload.description as string) ?? null;
      return { status: 200, data: ok(department) };
    }
    if (method === "DELETE") {
      if (
        store.complaints.some((row) => row.departmentId === id) ||
        store.categories.some((row) => row.department.id === id)
      ) {
        throw new MockApiError(409, "CONFLICT", "Cannot delete this department because it is still in use");
      }
      store.departments = store.departments.filter((row) => row.id !== id);
      return { status: 204, data: undefined };
    }
  }

  if (parts[0] === "users") {
    const admin = requireRoles(requireUser(token), ["ADMIN"]);
    if (method === "GET" && parts.length === 1) {
      let rows = [...store.users];
      const role = searchParams.get("role");
      const departmentId = parseIntParam(searchParams.get("departmentId"));
      const search = searchParams.get("search")?.toLowerCase();
      if (role) rows = rows.filter((row) => row.role === role);
      if (departmentId) rows = rows.filter((row) => row.departmentId === departmentId);
      if (search) {
        rows = rows.filter((row) => `${row.name} ${row.email}`.toLowerCase().includes(search));
      }
      const page = paginate(rows, Number(searchParams.get("page") ?? 1), Number(searchParams.get("limit") ?? 10));
      return { status: 200, data: ok(page.rows.map(toPublicUser), page.meta) };
    }
    if (method === "POST" && parts.length === 1) {
      const payload = readJson(body);
      const email = String(payload.email ?? "").trim().toLowerCase();
      if (store.users.some((row) => row.email === email)) {
        throw new MockApiError(409, "CONFLICT", "An account with this email already exists");
      }
      const role = payload.role as MockUser["role"];
      if (role === "STAFF" && !payload.departmentId) {
        throw new MockApiError(400, "VALIDATION_ERROR", "departmentId is required when role is STAFF");
      }
      const department = payload.departmentId ? findDepartment(Number(payload.departmentId)) : null;
      const user: MockUser = {
        id: store.nextUserId,
        name: String(payload.name ?? ""),
        email,
        password: String(payload.password ?? "Staff@123"),
        role,
        department: department ? { id: department.id, name: department.name } : null,
        departmentId: department?.id ?? null,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      store.nextUserId += 1;
      store.users.push(user);
      return { status: 201, data: ok(toPublicUser(user)) };
    }
    const id = Number(parts[1]);
    const user = findUser(id);
    if (!user) throw new MockApiError(404, "NOT_FOUND", "User not found");
    if (method === "PUT") {
      const payload = readJson(body);
      if (typeof payload.name === "string") user.name = payload.name;
      if (typeof payload.role === "string") user.role = payload.role as MockUser["role"];
      if ("isActive" in payload) user.isActive = Boolean(payload.isActive);
      if (typeof payload.password === "string") user.password = payload.password;
      if ("departmentId" in payload) {
        const department = payload.departmentId ? findDepartment(Number(payload.departmentId)) : null;
        user.departmentId = department?.id ?? null;
        user.department = department ? { id: department.id, name: department.name } : null;
      }
      return { status: 200, data: ok(toPublicUser(user)) };
    }
    if (method === "DELETE") {
      if (user.id === admin.id) throw new MockApiError(400, "VALIDATION_ERROR", "You cannot deactivate yourself");
      user.isActive = false;
      return { status: 200, data: ok(toPublicUser(user)) };
    }
  }

  if (parts[0] === "analytics") {
    const user = requireUser(token);
    requireRoles(user, ["STAFF", "ADMIN"]);
    const deptScope = user.role === "STAFF" ? user.departmentId : parseIntParam(searchParams.get("departmentId"));
    const scoped = store.complaints.filter((row) => (deptScope ? row.departmentId === deptScope : true));
    const now = Date.now();

    if (path === "/analytics/summary") {
      const resolvedHours = scoped
        .filter((row) => row.resolvedAt)
        .map((row) => (new Date(row.resolvedAt!).getTime() - new Date(row.createdAt).getTime()) / 3600000);
      const ratings = scoped.filter((row) => row.feedback).map((row) => row.feedback!.rating);
      const data: AnalyticsSummary = {
        total: scoped.length,
        submitted: scoped.filter((row) => row.status === "SUBMITTED").length,
        inProgress: scoped.filter((row) => row.status === "IN_PROGRESS").length,
        resolved: scoped.filter((row) => row.status === "RESOLVED").length,
        rejected: scoped.filter((row) => row.status === "REJECTED").length,
        overdue: scoped.filter((row) => isOverdue(row, now)).length,
        avgResolutionHours:
          resolvedHours.length === 0
            ? 0
            : Math.round((resolvedHours.reduce((sum, hours) => sum + hours, 0) / resolvedHours.length) * 10) / 10,
        avgRating: ratings.length === 0 ? 0 : Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100,
        last7Days: scoped.filter((row) => now - new Date(row.createdAt).getTime() <= 7 * 86400000).length,
      };
      return { status: 200, data: ok(data) };
    }

    if (path === "/analytics/by-category") {
      const data: CategoryCount[] = store.categories
        .map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          count: scoped.filter((row) => row.categoryId === category.id).length,
        }))
        .sort((a, b) => b.count - a.count);
      return { status: 200, data: ok(data) };
    }

    if (path === "/analytics/by-department") {
      requireRoles(user, ["ADMIN"]);
      const data: DepartmentPerformance[] = store.departments
        .map((department) => {
          const rows = store.complaints.filter((row) => row.departmentId === department.id);
          const resolvedHours = rows
            .filter((row) => row.resolvedAt)
            .map((row) => (new Date(row.resolvedAt!).getTime() - new Date(row.createdAt).getTime()) / 3600000);
          return {
            id: department.id,
            name: department.name,
            total: rows.length,
            open: rows.filter((row) => OPEN.includes(row.status)).length,
            resolved: rows.filter((row) => row.status === "RESOLVED").length,
            overdue: rows.filter((row) => isOverdue(row, now)).length,
            avgResolutionHours:
              resolvedHours.length === 0
                ? 0
                : Math.round((resolvedHours.reduce((sum, hours) => sum + hours, 0) / resolvedHours.length) * 10) / 10,
          };
        })
        .sort((a, b) => b.total - a.total);
      return { status: 200, data: ok(data) };
    }

    if (path === "/analytics/trend") {
      const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? 30)));
      const data: TrendPoint[] = [];
      for (let i = days - 1; i >= 0; i -= 1) {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - i);
        const key = day.toISOString().slice(0, 10);
        data.push({
          date: key,
          created: scoped.filter((row) => row.createdAt.slice(0, 10) === key).length,
          resolved: scoped.filter((row) => row.resolvedAt?.slice(0, 10) === key).length,
        });
      }
      return { status: 200, data: ok(data) };
    }

    if (path === "/analytics/ai-accuracy") {
      requireRoles(user, ["ADMIN"]);
      let aiSuggested = 0;
      let categoryKept = 0;
      let priorityKept = 0;
      store.complaints.forEach((row) => {
        if (!row.aiCategoryName) return;
        aiSuggested += 1;
        const category = findCategory(row.categoryId);
        if (row.aiCategoryName === category?.name) categoryKept += 1;
        if (row.aiPriority === row.priority) priorityKept += 1;
      });
      const data: AiAccuracy = {
        aiSuggested,
        categoryKept,
        priorityKept,
        categoryAccuracy: aiSuggested ? Number((categoryKept / aiSuggested).toFixed(3)) : 0,
        priorityAccuracy: aiSuggested ? Number((priorityKept / aiSuggested).toFixed(3)) : 0,
      };
      return { status: 200, data: ok(data) };
    }
  }

  if (method === "POST" && path === "/ai/analyze") {
    requireUser(token);
    const form = body instanceof FormData ? body : readJson(body);
    const description = formString(form, "description").trim();
    if (description.length < 10) {
      throw new MockApiError(400, "VALIDATION_ERROR", "Description must be at least 10 characters");
    }
    return {
      status: 200,
      data: ok(
        keywordAnalyze({
          description,
          title: formString(form, "title") || undefined,
          location: formString(form, "location") || undefined,
        }),
      ),
    };
  }

  if (method === "POST" && path === "/ai/duplicates") {
    requireUser(token);
    const payload = readJson(body);
    const description = String(payload.description ?? "").toLowerCase();
    const title = String(payload.title ?? "").toLowerCase();
    const categoryId = typeof payload.categoryId === "number" ? payload.categoryId : undefined;
    const hay = `${title} ${description}`;
    const similar: SimilarComplaint[] = store.complaints
      .filter((row) => OPEN.includes(row.status))
      .map((row) => {
        const category = findCategory(row.categoryId);
        const blob = `${row.title} ${row.description} ${row.location}`.toLowerCase();
        let score = 0;
        if (/wifi|wi-fi|internet|network/.test(hay) && /block c/.test(hay) && /wifi|wi-fi|internet|network/.test(blob) && /block c/.test(blob)) {
          score += 0.92;
        } else if (/wifi|wi-fi|internet|network/.test(hay) && /wifi|wi-fi|internet|network/.test(blob)) {
          score += 0.45;
        }
        if (/block a/.test(hay) && /block a/.test(blob) && /fan/.test(hay) && /fan/.test(blob)) score += 0.7;
        if (/hostel|water|leak/.test(hay) && /hostel|water|leak/.test(blob)) score += 0.35;
        if (categoryId && row.categoryId === categoryId) score += 0.1;
        return {
          id: row.id,
          ticketCode: row.ticketCode,
          title: row.title,
          location: row.location,
          status: row.status,
          categoryName: category?.name ?? "Unknown",
          upvoteCount: store.upvotes.filter((vote) => vote.complaintId === row.id).length,
          similarity: Math.min(0.97, score),
        };
      })
      .filter((row) => row.similarity >= 0.8)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    return { status: 200, data: ok(similar) };
  }

  if (method === "GET" && path === "/ai/insights") {
    requireRoles(requireUser(token), ["ADMIN"]);
    const data: AiInsights = {
      generatedAt: new Date().toISOString(),
      headline:
        "Wi-Fi complaints in Block C doubled this week; IT is meeting SLAs but Housekeeping is not.",
      insights: [
        {
          title: "Wi-Fi spike in Block C",
          detail: "6 open Wi-Fi tickets mention Block C 2nd floor, Room 214, Room 312 and the east staircase.",
          severity: "high",
        },
        {
          title: "Block C 2nd floor is a repeat outage",
          detail: "Multiple open tickets share the Block C 2nd floor location and are already collecting upvotes.",
          severity: "high",
        },
        {
          title: "Washroom SLA breaches",
          detail: "Housekeeping has overdue washroom tickets in Block A and Block C that are past the 12-hour SLA.",
          severity: "medium",
        },
        {
          title: "Hostel water complaints are clustering",
          detail: "Boys Hostel B has both a building-wide outage and room-level leaks reported in the last day.",
          severity: "medium",
        },
      ],
      recommendations: [
        "Schedule an access point audit on Block C 2nd and 3rd floors.",
        "Add an evening cleaning shift for Block A washrooms.",
        "Send a plumber to Boys Hostel B before the evening peak.",
      ],
      source: "ai",
    };
    return { status: 200, data: ok(data) };
  }

  throw new MockApiError(404, "NOT_FOUND", `No mock handler for ${method} ${path}`);
}

export function listUsers(): User[] {
  return store.users.map(toPublicUser);
}
