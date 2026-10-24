import type { Prisma, Role } from "@prisma/client";

/** `{ id, name }` reference used all over Section 10.2. */
export interface Ref {
  id: number;
  name: string;
}

export const refSelect = { id: true, name: true } as const satisfies Prisma.UserSelect & Prisma.DepartmentSelect;

export function toRef(row: { id: number; name: string } | null | undefined): Ref | null {
  return row ? { id: row.id, name: row.name } : null;
}

/** Prisma select for a user WITHOUT passwordHash. Use this everywhere a user is read. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  department: { select: refSelect },
} satisfies Prisma.UserSelect;

/** The user row as loaded by `authenticate` and attached to `req.user`. */
export type AuthUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** Section 10.2 `User`. */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: Ref | null;
  isActive: boolean;
  createdAt: string;
}

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: toRef(user.department),
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}
