import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { buildMeta, type PaginationMeta } from "../utils/response.js";
import { refSelect, toRef, type AuthUser } from "../utils/mappers.js";
import {
  OPEN_STATUSES,
  allowedTransitionsFrom,
  canTransition,
  isNoteRequired,
  isOpenStatus,
} from "../utils/statusRules.js";
import type { ComplaintDetail, ComplaintPermissions, ComplaintSummary, TrackResponse } from "../types/api.js";
import type {
  AssignInput,
  ChangeStatusInput,
  CreateComplaintInput,
  FeedQuery,
  FeedbackInput,
  ListComplaintsQuery,
  UpdateComplaintInput,
} from "../validators/complaint.validators.js";
import * as storage from "./storage.service.js";
import { embedAndStore } from "./duplicate.service.js";
import { MAX_IMAGES_PER_COMPLAINT } from "../middleware/upload.js";

// ---------------------------------------------------------------------------
// Prisma selects / includes
// ---------------------------------------------------------------------------

const categorySelect = { id: true, name: true, icon: true } as const;

export function summaryInclude(viewerId: number) {
  return {
    category: { select: categorySelect },
    department: { select: refSelect },
    createdBy: { select: refSelect },
    assignedTo: { select: refSelect },
    images: { select: { id: true, url: true }, orderBy: { id: "asc" as const }, take: 1 },
    upvotes: { where: { userId: viewerId }, select: { userId: true } },
    _count: { select: { upvotes: true } },
  } satisfies Prisma.ComplaintInclude;
}
export type SummaryRow = Prisma.ComplaintGetPayload<{ include: ReturnType<typeof summaryInclude> }>;

export function detailInclude(viewerId: number) {
  return {
    ...summaryInclude(viewerId),
    images: { select: { id: true, url: true }, orderBy: { id: "asc" as const } },
    history: {
      orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
      include: { changedBy: { select: { id: true, name: true, role: true } } },
    },
    feedback: { select: { rating: true, comment: true, createdAt: true } },
  } satisfies Prisma.ComplaintInclude;
}
export type DetailRow = Prisma.ComplaintGetPayload<{ include: ReturnType<typeof detailInclude> }>;

// ---------------------------------------------------------------------------
// Mappers (Section 10.2 shapes)
// ---------------------------------------------------------------------------

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

function canSeeCreator(row: { isAnonymous: boolean; createdById: number }, viewer: AuthUser): boolean {
  return !row.isAnonymous || row.createdById === viewer.id || viewer.role === "ADMIN";
}

export function toSummary(row: SummaryRow, viewer: AuthUser, hideCreator = false): ComplaintSummary {
  const open = isOpenStatus(row.status);
  return {
    id: row.id,
    ticketCode: row.ticketCode,
    title: row.title,
    location: row.location,
    status: row.status,
    priority: row.priority,
    category: { id: row.category.id, name: row.category.name, icon: row.category.icon },
    department: { id: row.department.id, name: row.department.name },
    createdBy: !hideCreator && canSeeCreator(row, viewer) ? toRef(row.createdBy) : null,
    assignedTo: toRef(row.assignedTo),
    isAnonymous: row.isAnonymous,
    upvoteCount: row._count.upvotes,
    hasUpvoted: row.upvotes.length > 0,
    isOverdue: open && row.dueAt !== null && row.dueAt.getTime() < Date.now(),
    dueAt: iso(row.dueAt),
    resolvedAt: iso(row.resolvedAt),
    thumbnailUrl: row.images[0]?.url ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Who may see this complaint at all (others get 404, Section 10.4). */
export function canView(row: { createdById: number; departmentId: number }, viewer: AuthUser): boolean {
  if (viewer.role === "ADMIN") return true;
  if (row.createdById === viewer.id) return true;
  return viewer.role === "STAFF" && viewer.departmentId !== null && viewer.departmentId === row.departmentId;
}

/** Staff of the complaint's department or admin: may change status / assign. */
export function canManage(row: { departmentId: number }, viewer: AuthUser): boolean {
  if (viewer.role === "ADMIN") return true;
  return viewer.role === "STAFF" && viewer.departmentId !== null && viewer.departmentId === row.departmentId;
}

export function computePermissions(row: DetailRow, viewer: AuthUser): ComplaintPermissions {
  const isAdmin = viewer.role === "ADMIN";
  const isOwner = row.createdById === viewer.id;
  const manage = canManage(row, viewer);
  const open = isOpenStatus(row.status);
  const canEdit = isAdmin || (isOwner && row.status === "SUBMITTED");
  const allowedTransitions = manage ? allowedTransitionsFrom(row.status) : [];
  return {
    canEdit,
    canDelete: canEdit,
    canChangeStatus: allowedTransitions.length > 0,
    canAssign: manage && open,
    canUpvote: !isOwner && open,
    canGiveFeedback: isOwner && row.status === "RESOLVED" && row.feedback === null,
    allowedTransitions,
  };
}

export function toDetail(row: DetailRow, viewer: AuthUser): ComplaintDetail {
  const hasAi =
    row.aiCategoryName !== null || row.aiPriority !== null || row.aiConfidence !== null || row.aiReason !== null;
  const showCreator = canSeeCreator(row, viewer);
  return {
    ...toSummary(row, viewer),
    description: row.description,
    images: row.images.map((i) => ({ id: i.id, url: i.url })),
    history: row.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      changedBy: {
        id: h.changedBy.id,
        // Anonymous complaints: hide the creator's name in their own history rows too.
        name: !showCreator && h.changedBy.id === row.createdById ? "Anonymous" : h.changedBy.name,
        role: h.changedBy.role,
      },
      createdAt: h.createdAt.toISOString(),
    })),
    feedback: row.feedback
      ? { rating: row.feedback.rating, comment: row.feedback.comment, createdAt: row.feedback.createdAt.toISOString() }
      : null,
    ai: hasAi
      ? { categoryName: row.aiCategoryName, priority: row.aiPriority, confidence: row.aiConfidence, reason: row.aiReason }
      : null,
    permissions: computePermissions(row, viewer),
  };
}

// ---------------------------------------------------------------------------
// Loading helpers
// ---------------------------------------------------------------------------

/** Loads a complaint the viewer is allowed to see, else 404 (never 403, to not reveal existence). */
export async function loadVisible(id: number, viewer: AuthUser): Promise<DetailRow> {
  const row = await prisma.complaint.findUnique({ where: { id }, include: detailInclude(viewer.id) });
  if (!row || !canView(row, viewer)) throw ApiError.notFound("Complaint not found");
  return row;
}

export async function getComplaint(id: number, viewer: AuthUser): Promise<ComplaintDetail> {
  return toDetail(await loadVisible(id, viewer), viewer);
}

/** Owner only while SUBMITTED (422 otherwise), admin always; other viewers 403. */
function assertCanEdit(row: DetailRow, viewer: AuthUser): void {
  if (viewer.role === "ADMIN") return;
  if (row.createdById !== viewer.id) throw ApiError.forbidden("Only the complaint owner can modify this complaint");
  if (row.status !== "SUBMITTED") {
    throw ApiError.invalidTransition("Complaints can only be edited or deleted while they are SUBMITTED");
  }
}

function scheduleEmbedding(complaintId: number): void {
  void embedAndStore(complaintId).catch((err: unknown) => {
    console.error(`[embed] failed for complaint ${complaintId}:`, err instanceof Error ? err.message : err);
  });
}

async function loadCategoryOrFail(categoryId: number) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, slaHours: true, departmentId: true },
  });
  if (!category) throw ApiError.validation("Category not found", [{ path: "categoryId", message: "Category not found" }]);
  return category;
}

// ---------------------------------------------------------------------------
// List / feed
// ---------------------------------------------------------------------------

function buildWhere(q: ListComplaintsQuery | FeedQuery, viewer: AuthUser, mode: "list" | "feed"): Prisma.ComplaintWhereInput {
  const and: Prisma.ComplaintWhereInput[] = [];

  if (mode === "feed") {
    and.push({ status: { in: OPEN_STATUSES } });
    if (q.departmentId) and.push({ departmentId: q.departmentId });
  } else {
    // Role scoping (Section 10.4)
    if (viewer.role === "STUDENT") {
      and.push({ createdById: viewer.id });
    } else if (viewer.role === "STAFF") {
      and.push(
        viewer.departmentId !== null
          ? { OR: [{ departmentId: viewer.departmentId }, { createdById: viewer.id }] }
          : { createdById: viewer.id },
      );
    } else if (q.departmentId) {
      and.push({ departmentId: q.departmentId });
    }

    const listQuery = q as ListComplaintsQuery;
    if (listQuery.mine) and.push({ createdById: viewer.id });
    if (listQuery.assignedTo !== undefined && viewer.role !== "STUDENT") {
      if (listQuery.assignedTo === "me") and.push({ assignedToId: viewer.id });
      else if (listQuery.assignedTo === "unassigned") and.push({ assignedToId: null });
      else and.push({ assignedToId: listQuery.assignedTo });
    }
  }

  if (q.status?.length) and.push({ status: { in: q.status } });
  if (q.priority?.length) and.push({ priority: { in: q.priority } });
  if (q.categoryId) and.push({ categoryId: q.categoryId });
  if (q.overdue) and.push({ status: { in: OPEN_STATUSES }, dueAt: { lt: new Date() } });
  if (q.search) {
    const contains = { contains: q.search, mode: "insensitive" as const };
    and.push({ OR: [{ ticketCode: contains }, { title: contains }, { description: contains }, { location: contains }] });
  }
  if (q.from || q.to) {
    and.push({ createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildOrderBy(sort: ListComplaintsQuery["sort"]): Prisma.ComplaintOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "priority":
      // Postgres orders enums by declaration order: LOW < MEDIUM < HIGH < CRITICAL.
      return [{ priority: "desc" }, { createdAt: "desc" }];
    case "upvotes":
      return [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }];
    case "due":
      return [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

async function paginate(
  where: Prisma.ComplaintWhereInput,
  q: { sort: ListComplaintsQuery["sort"]; page: number; limit: number },
  viewer: AuthUser,
  hideCreator: boolean,
): Promise<{ data: ComplaintSummary[]; meta: PaginationMeta }> {
  const [rows, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: summaryInclude(viewer.id),
      orderBy: buildOrderBy(q.sort),
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.complaint.count({ where }),
  ]);
  return { data: rows.map((r) => toSummary(r, viewer, hideCreator)), meta: buildMeta(q.page, q.limit, total) };
}

export function listComplaints(q: ListComplaintsQuery, viewer: AuthUser) {
  return paginate(buildWhere(q, viewer, "list"), q, viewer, false);
}

/** Campus feed: open complaints campus-wide, creator always hidden. */
export function feedComplaints(q: FeedQuery, viewer: AuthUser) {
  return paginate(buildWhere(q, viewer, "feed"), q, viewer, true);
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

export async function createComplaint(
  input: CreateComplaintInput,
  files: Express.Multer.File[],
  viewer: AuthUser,
): Promise<ComplaintDetail> {
  // 1. Category -> department + SLA (never trust the client for routing)
  const category = await loadCategoryOrFail(input.categoryId);

  // 2. Upload images (500 and no complaint if this fails)
  const uploaded = await storage.uploadImages(files);

  // 3. Transaction: complaint + images + first history row
  let complaintId: number;
  try {
    complaintId = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          title: input.title,
          description: input.description,
          location: input.location,
          priority: input.priority,
          isAnonymous: input.isAnonymous,
          categoryId: category.id,
          departmentId: category.departmentId,
          createdById: viewer.id,
          dueAt: new Date(Date.now() + category.slaHours * 3_600_000),
          aiCategoryName: input.aiCategoryName ?? null,
          aiPriority: input.aiPriority ?? null,
          aiConfidence: input.aiConfidence ?? null,
          aiReason: input.aiReason ?? null,
          images: uploaded.length > 0 ? { createMany: { data: uploaded } } : undefined,
          history: {
            create: { fromStatus: null, toStatus: "SUBMITTED", note: "Complaint submitted", changedById: viewer.id },
          },
        },
        select: { id: true },
      });
      return complaint.id;
    });
  } catch (err) {
    await storage.deleteFiles(uploaded.map((u) => u.path));
    throw err;
  }

  // 5. Background embedding - never awaited
  scheduleEmbedding(complaintId);

  // 4. 201 ComplaintDetail
  return getComplaint(complaintId, viewer);
}

export async function updateComplaint(id: number, input: UpdateComplaintInput, viewer: AuthUser): Promise<ComplaintDetail> {
  const row = await loadVisible(id, viewer);
  assertCanEdit(row, viewer);

  const data: Prisma.ComplaintUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.location !== undefined) data.location = input.location;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.isAnonymous !== undefined) data.isAnonymous = input.isAnonymous;

  if (input.categoryId !== undefined && input.categoryId !== row.categoryId) {
    const category = await loadCategoryOrFail(input.categoryId);
    data.categoryId = category.id;
    data.dueAt = new Date(row.createdAt.getTime() + category.slaHours * 3_600_000);
    if (category.departmentId !== row.departmentId) {
      data.departmentId = category.departmentId;
      // The previous assignee belongs to the old department.
      if (row.assignedToId !== null) data.assignedToId = null;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({ where: { id }, data });
    // Text may have changed: drop the stale vector; re-embedded in the background below.
    await tx.$executeRaw`UPDATE complaints SET embedding = NULL WHERE id = ${id}`;
  });
  scheduleEmbedding(id);

  return getComplaint(id, viewer);
}

export async function deleteComplaint(id: number, viewer: AuthUser): Promise<void> {
  const row = await loadVisible(id, viewer);
  assertCanEdit(row, viewer);

  const images = await prisma.complaintImage.findMany({ where: { complaintId: id }, select: { path: true } });
  await storage.deleteFiles(images.map((i) => i.path));
  // Cascades to images, history, upvotes, feedback.
  await prisma.complaint.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function addImages(id: number, files: Express.Multer.File[], viewer: AuthUser): Promise<ComplaintDetail> {
  const row = await loadVisible(id, viewer);
  assertCanEdit(row, viewer);

  if (files.length === 0) {
    throw ApiError.validation("Attach at least one image", [{ path: "images", message: "Attach at least one image" }]);
  }
  const max = MAX_IMAGES_PER_COMPLAINT;
  if (row.images.length + files.length > max) {
    const message = `A complaint can have at most ${max} images (it already has ${row.images.length})`;
    throw ApiError.validation(message, [{ path: "images", message }]);
  }

  const uploaded = await storage.uploadImages(files);
  try {
    await prisma.complaintImage.createMany({ data: uploaded.map((u) => ({ complaintId: id, ...u })) });
  } catch (err) {
    await storage.deleteFiles(uploaded.map((u) => u.path));
    throw err;
  }
  return getComplaint(id, viewer);
}

export async function removeImage(id: number, imageId: number, viewer: AuthUser): Promise<ComplaintDetail> {
  const row = await loadVisible(id, viewer);
  assertCanEdit(row, viewer);

  const image = await prisma.complaintImage.findFirst({ where: { id: imageId, complaintId: id } });
  if (!image) throw ApiError.notFound("Image not found");

  await prisma.complaintImage.delete({ where: { id: image.id } });
  await storage.deleteFiles([image.path]);
  return getComplaint(id, viewer);
}

// ---------------------------------------------------------------------------
// Workflow: status / assign / upvote / feedback / public track
// ---------------------------------------------------------------------------

function assertCanManage(row: { departmentId: number }, viewer: AuthUser): void {
  if (!canManage(row, viewer)) throw ApiError.forbidden("You cannot manage complaints outside your department");
}

export async function changeStatus(id: number, input: ChangeStatusInput, viewer: AuthUser): Promise<ComplaintDetail> {
  const row = await loadVisible(id, viewer);
  assertCanManage(row, viewer);

  if (!canTransition(row.status, input.status)) {
    throw ApiError.invalidTransition(`Cannot change status from ${row.status} to ${input.status}`);
  }
  if (isNoteRequired(row.status, input.status) && !input.note) {
    throw ApiError.invalidTransition("A note is required when rejecting or reopening a complaint");
  }

  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id },
      data: {
        status: input.status,
        resolvedAt: input.status === "RESOLVED" ? new Date() : input.status === "IN_PROGRESS" ? null : row.resolvedAt,
      },
    });
    await tx.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: row.status,
        toStatus: input.status,
        note: input.note ?? null,
        changedById: viewer.id,
      },
    });
  });

  return getComplaint(id, viewer);
}

export async function assignComplaint(id: number, input: AssignInput, viewer: AuthUser): Promise<ComplaintDetail> {
  const row = await loadVisible(id, viewer);
  assertCanManage(row, viewer);

  let note = "Unassigned";
  if (input.assignedToId !== null) {
    const staff = await prisma.user.findUnique({
      where: { id: input.assignedToId },
      select: { id: true, name: true, role: true, isActive: true, departmentId: true },
    });
    if (!staff || staff.role !== "STAFF" || !staff.isActive || staff.departmentId !== row.departmentId) {
      throw ApiError.invalidTransition("Assignee must be an active staff member in this complaint's department");
    }
    note = `Assigned to ${staff.name}`;
  }

  const moveToInProgress = row.status === "SUBMITTED";

  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id },
      data: {
        assignedToId: input.assignedToId,
        ...(moveToInProgress ? { status: "IN_PROGRESS" as const } : {}),
      },
    });
    await tx.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: row.status,
        toStatus: moveToInProgress ? "IN_PROGRESS" : row.status,
        note,
        changedById: viewer.id,
      },
    });
  });

  return getComplaint(id, viewer);
}

export async function addUpvote(id: number, viewer: AuthUser): Promise<{ upvoteCount: number; hasUpvoted: boolean }> {
  const row = await prisma.complaint.findUnique({
    where: { id },
    select: { id: true, createdById: true, status: true },
  });
  if (!row) throw ApiError.notFound("Complaint not found");
  if (row.createdById === viewer.id) throw ApiError.invalidTransition("You cannot upvote your own complaint");
  if (!isOpenStatus(row.status)) throw ApiError.invalidTransition("Closed complaints cannot be upvoted");

  try {
    await prisma.upvote.create({ data: { complaintId: id, userId: viewer.id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("You have already upvoted this complaint");
    }
    throw err;
  }

  const upvoteCount = await prisma.upvote.count({ where: { complaintId: id } });
  return { upvoteCount, hasUpvoted: true };
}

export async function removeUpvote(id: number, viewer: AuthUser): Promise<{ upvoteCount: number; hasUpvoted: boolean }> {
  const row = await prisma.complaint.findUnique({ where: { id }, select: { id: true } });
  if (!row) throw ApiError.notFound("Complaint not found");

  await prisma.upvote.deleteMany({ where: { complaintId: id, userId: viewer.id } });
  const upvoteCount = await prisma.upvote.count({ where: { complaintId: id } });
  return { upvoteCount, hasUpvoted: false };
}

export async function addFeedback(
  id: number,
  input: FeedbackInput,
  viewer: AuthUser,
): Promise<{ rating: number; comment: string | null; createdAt: string }> {
  const row = await loadVisible(id, viewer);
  if (row.createdById !== viewer.id) throw ApiError.forbidden("Only the complaint owner can give feedback");
  if (row.status !== "RESOLVED") throw ApiError.invalidTransition("Feedback can only be given after the complaint is resolved");
  if (row.feedback) throw ApiError.conflict("Feedback has already been submitted for this complaint");

  const created = await prisma.feedback.create({
    data: { complaintId: id, userId: viewer.id, rating: input.rating, comment: input.comment ?? null },
    select: { rating: true, comment: true, createdAt: true },
  });
  return { rating: created.rating, comment: created.comment, createdAt: created.createdAt.toISOString() };
}

/** Public tracking — no names, emails, notes, descriptions or images (Section 10.4). */
export async function trackByCode(ticketCode: string): Promise<TrackResponse> {
  const row = await prisma.complaint.findFirst({
    where: { ticketCode: { equals: ticketCode, mode: "insensitive" } },
    select: {
      ticketCode: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      dueAt: true,
      category: { select: { name: true } },
      department: { select: { name: true } },
      history: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { toStatus: true, createdAt: true } },
    },
  });
  if (!row) throw ApiError.notFound("Complaint not found");

  return {
    ticketCode: row.ticketCode,
    title: row.title,
    status: row.status,
    priority: row.priority,
    category: row.category.name,
    department: row.department.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    dueAt: iso(row.dueAt),
    timeline: row.history.map((h) => ({ status: h.toStatus, at: h.createdAt.toISOString() })),
  };
}
