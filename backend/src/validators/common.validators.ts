import { z } from "zod";

export const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const idParam = z.coerce.number({ error: "id must be a number" }).int().positive();

export const idParams = z.object({ id: idParam });

export const paginationQuery = {
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(10)),
};

/** Comma-separated enum list query param, e.g. `status=SUBMITTED,IN_PROGRESS`. */
export function csvEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .optional()
    .transform((raw, ctx): T[number][] | undefined => {
      if (raw === undefined || raw.trim() === "") return undefined;
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = parts.filter((p) => !values.includes(p));
      if (invalid.length > 0) {
        ctx.addIssue({ code: "custom", message: `Invalid value: ${invalid.join(", ")}. Allowed: ${values.join(", ")}` });
        return z.NEVER;
      }
      return parts as T[number][];
    });
}

/** `"true"` / `"false"` (multipart) or real booleans (JSON). */
export const booleanish = z.preprocess(
  (v) => (typeof v === "boolean" ? String(v) : emptyToUndefined(v)),
  z.enum(["true", "false"]).optional(),
);
