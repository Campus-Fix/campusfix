import { z } from "zod";
import { emailSchema, nameSchema, passwordSchema } from "./auth.validators.js";
import { emptyToUndefined, idParams, paginationQuery } from "./common.validators.js";

export { idParams };

const optionalString = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const categoryBody = z.object({
  name: z.string({ error: "Name is required" }).trim().min(2).max(80),
  description: optionalString(400).nullable().optional(),
  icon: optionalString(40).nullable().optional(),
  slaHours: z.number({ error: "slaHours is required" }).int().min(1).max(720),
  departmentId: z.number({ error: "departmentId is required" }).int().positive(),
});
export const updateCategoryBody = categoryBody.partial();

export const departmentBody = z.object({
  name: z.string({ error: "Name is required" }).trim().min(2).max(80),
  email: z.preprocess(emptyToUndefined, emailSchema.optional().nullable()),
  description: optionalString(400).nullable().optional(),
});
export const updateDepartmentBody = departmentBody.partial();

export const ROLE_VALUES = ["STUDENT", "STAFF", "ADMIN"] as const;

export const createUserBody = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(ROLE_VALUES),
    departmentId: z.number().int().positive().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "STAFF" && !value.departmentId) {
      ctx.addIssue({ code: "custom", path: ["departmentId"], message: "departmentId is required when role is STAFF" });
    }
  });

export const updateUserBody = z.object({
  name: nameSchema.optional(),
  role: z.enum(ROLE_VALUES).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export const listUsersQuery = z.object({
  role: z.preprocess(emptyToUndefined, z.enum(ROLE_VALUES).optional()),
  departmentId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  ...paginationQuery,
});

export const trendQuery = z.object({
  days: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(90).default(30)),
});
