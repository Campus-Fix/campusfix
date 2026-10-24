import { z } from "zod";

/** Multipart forms send untouched optional inputs as "", which should count as "not provided". */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const descriptionSchema = z
  .string({ error: "Description is required" })
  .trim()
  .min(10, "Description must be at least 10 characters")
  .max(2000, "Description must be at most 2000 characters");

const optionalText = (field: string, max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `${field} must be at most ${max} characters`).optional());

/** POST /ai/analyze (multipart; the optional image is handled by multer). */
export const analyzeSchema = z.object({
  description: descriptionSchema,
  title: optionalText("Title", 120),
  location: optionalText("Location", 120),
});

/** POST /ai/duplicates */
export const duplicatesSchema = z.object({
  description: descriptionSchema,
  title: optionalText("Title", 120),
  categoryId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive("categoryId must be a positive integer").optional(),
  ),
});

/** GET /ai/insights?refresh=true */
export const insightsQuerySchema = z.object({
  refresh: z
    .enum(["true", "false"], { error: 'refresh must be "true" or "false"' })
    .optional()
    .transform((v) => v === "true"),
});

export type AnalyzeInput = z.infer<typeof analyzeSchema>;
export type DuplicatesInput = z.infer<typeof duplicatesSchema>;
export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
