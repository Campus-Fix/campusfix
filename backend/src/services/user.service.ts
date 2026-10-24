import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "./auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { publicUserSelect, toPublicUser, type AuthUser, type PublicUser } from "../utils/mappers.js";
import { buildMeta, type PaginationMeta } from "../utils/response.js";

export async function listUsers(q: {
  role?: Role;
  departmentId?: number;
  search?: string;
  page: number;
  limit: number;
}): Promise<{ data: PublicUser[]; meta: PaginationMeta }> {
  const where: Prisma.UserWhereInput = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.departmentId ? { departmentId: q.departmentId } : {}),
    ...(q.search
      ? { OR: [{ name: { contains: q.search, mode: "insensitive" } }, { email: { contains: q.search, mode: "insensitive" } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { data: rows.map(toPublicUser), meta: buildMeta(q.page, q.limit, total) };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  departmentId?: number | null;
}): Promise<PublicUser> {
  if (input.role === "STAFF") {
    if (!input.departmentId) throw ApiError.validation("departmentId is required when role is STAFF");
    await assertDepartment(input.departmentId);
  }
  try {
    const row = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        departmentId: input.role === "STAFF" ? input.departmentId! : (input.departmentId ?? null),
      },
      select: publicUserSelect,
    });
    return toPublicUser(row);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw err;
  }
}

export async function updateUser(
  id: number,
  input: { name?: string; role?: Role; departmentId?: number | null; isActive?: boolean; password?: string },
): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing) throw ApiError.notFound("User not found");

  const nextRole = input.role ?? existing.role;
  if (nextRole === "STAFF") {
    const deptId = input.departmentId !== undefined ? input.departmentId : undefined;
    if (deptId === null) throw ApiError.validation("STAFF users must belong to a department");
    if (deptId !== undefined) await assertDepartment(deptId);
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.role !== undefined) data.role = input.role;
  if (input.departmentId !== undefined) {
    data.department = input.departmentId === null ? { disconnect: true } : { connect: { id: input.departmentId } };
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);

  const row = await prisma.user.update({ where: { id }, data, select: publicUserSelect });
  return toPublicUser(row);
}

/** Soft delete. An admin cannot deactivate themselves. */
export async function deactivateUser(id: number, actor: AuthUser): Promise<void> {
  if (id === actor.id) throw ApiError.forbidden("You cannot deactivate your own account");
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound("User not found");
  await prisma.user.update({ where: { id }, data: { isActive: false } });
}

async function assertDepartment(departmentId: number) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
  if (!dept) throw ApiError.validation("Department not found", [{ path: "departmentId", message: "Department not found" }]);
}
