import { z } from "zod";

export const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

/** >= 8 chars, at least one letter and one number (MASTER_PLAN 10.4). 72 is bcrypt's input limit. */
export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

export const nameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const updateMeSchema = z
  .object({
    name: nameSchema.optional(),
    currentPassword: z.string().optional(),
    newPassword: passwordSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== undefined && !value.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Current password is required to set a new password",
      });
    }
    if (value.name === undefined && value.newPassword === undefined) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Provide a new name or a new password" });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
