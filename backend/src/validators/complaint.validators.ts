import { z } from "zod";
import { booleanish, csvEnum, emptyToUndefined, idParam, idParams, paginationQuery } from "./common.validators.js";

export const STATUS_VALUES = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const;
export const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const SORT_VALUES = ["newest", "oldest", "priority", "upvotes", "due"] as const;

const optionalInt = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date({ error: "Must be an ISO date" }).optional());

const baseListQuery = {
  status: csvEnum(STATUS_VALUES),
  priority: csvEnum(PRIORITY_VALUES),
  categoryId: optionalInt,
  departmentId: optionalInt,
  overdue: booleanish.transform((v) => v === "true"),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  from: optionalDate,
  to: optionalDate,
  ...paginationQuery,
};

export const listComplaintsQuery = z.object({
  ...baseListQuery,
  /** Extension: `mine=true` restricts any role to complaints they created (staff "My Complaints" page). */
  mine: booleanish.transform((v) => v === "true"),
  assignedTo: z.preprocess(
    emptyToUndefined,
    z.union([z.literal("me"), z.literal("unassigned"), z.coerce.number().int().positive()]).optional(),
  ),
  sort: z.preprocess(emptyToUndefined, z.enum(SORT_VALUES).default("newest")),
});

export const feedQuery = z.object({
  ...baseListQuery,
  sort: z.preprocess(emptyToUndefined, z.enum(SORT_VALUES).default("upvotes")),
});

export type ListComplaintsQuery = z.infer<typeof listComplaintsQuery>;
export type FeedQuery = z.infer<typeof feedQuery>;

const title = z.string({ error: "Title is required" }).trim().min(5, "Title must be at least 5 characters").max(120, "Title must be at most 120 characters");
const description = z
  .string({ error: "Description is required" })
  .trim()
  .min(10, "Description must be at least 10 characters")
  .max(2000, "Description must be at most 2000 characters");
const location = z.string({ error: "Location is required" }).trim().min(2, "Location must be at least 2 characters").max(120, "Location must be at most 120 characters");
const categoryId = z.coerce.number({ error: "Category is required" }).int().positive("Category is required");
const priority = z.preprocess(emptyToUndefined, z.enum(PRIORITY_VALUES, { error: "Invalid priority" }));

/** POST /complaints - multipart text fields arrive as strings, so everything is coerced. */
export const createComplaintBody = z.object({
  title,
  description,
  location,
  categoryId,
  priority: priority.default("MEDIUM"),
  isAnonymous: booleanish.transform((v) => v === "true"),
  aiCategoryName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  aiPriority: z.preprocess(emptyToUndefined, z.enum(PRIORITY_VALUES).optional()),
  aiConfidence: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(1).optional()),
  aiReason: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});
export type CreateComplaintInput = z.infer<typeof createComplaintBody>;

/** PUT /complaints/:id - JSON. */
export const updateComplaintBody = z.object({
  title: title.optional(),
  description: description.optional(),
  location: location.optional(),
  categoryId: categoryId.optional(),
  priority: priority.optional(),
  isAnonymous: z.boolean().optional(),
});
export type UpdateComplaintInput = z.infer<typeof updateComplaintBody>;

export const complaintIdParams = idParams;
export const imageParams = z.object({ id: idParam, imageId: idParam });

/** PATCH /complaints/:id/status */
export const changeStatusBody = z.object({
  status: z.enum(STATUS_VALUES, { error: "Invalid status" }),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Note must be at most 500 characters").optional()),
});
export type ChangeStatusInput = z.infer<typeof changeStatusBody>;

/** PATCH /complaints/:id/assign */
export const assignBody = z.object({
  assignedToId: z.number({ error: "assignedToId must be a number or null" }).int().positive().nullable(),
});
export type AssignInput = z.infer<typeof assignBody>;

/** POST /complaints/:id/feedback */
export const feedbackBody = z.object({
  rating: z.number({ error: "Rating is required" }).int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Comment must be at most 500 characters").optional()),
});
export type FeedbackInput = z.infer<typeof feedbackBody>;

export const ticketCodeParams = z.object({
  ticketCode: z.string().trim().min(3).max(32),
});
