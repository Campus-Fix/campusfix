import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { toRef, type AuthUser, type Ref } from "../utils/mappers.js";
import type { Department } from "../types/api.js";

const include = { _count: { select: { users: true, categories: true, complaints: true } } } as const;

function toDepartment(row: {
  id: number;
  name: string;
  email: string | null;
  description: string | null;
  _count: { users: number; categories: number };
}): Department {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    description: row.description,
    staffCount: row._count.users,
    categoryCount: row._count.categories,
  };
}

export async function listDepartments(): Promise<Department[]> {
  const rows = await prisma.department.findMany({ include, orderBy: { name: "asc" } });
  return rows.map(toDepartment);
}

export async function createDepartment(input: {
  name: string;
  email?: string | null;
  description?: string | null;
}): Promise<Department> {
  try {
    const row = await prisma.department.create({
      data: { name: input.name, email: input.email ?? null, description: input.description ?? null },
      include,
    });
    return toDepartment(row);
  } catch (err) {
    throw uniqueOrThrow(err);
  }
}

export async function updateDepartment(
  id: number,
  input: { name?: string; email?: string | null; description?: string | null },
): Promise<Department> {
  await findOr404(id);
  try {
    const row = await prisma.department.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include,
    });
    return toDepartment(row);
  } catch (err) {
    throw uniqueOrThrow(err);
  }
}

export async function deleteDepartment(id: number): Promise<void> {
  const row = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { categories: true, complaints: true } } },
  });
  if (!row) throw ApiError.notFound("Department not found");
  if (row._count.categories > 0 || row._count.complaints > 0) {
    throw ApiError.conflict(
      `Cannot delete "${row.name}" because it still has ${row._count.categories} category(ies) or ${row._count.complaints} complaint(s)`,
    );
  }
  await prisma.department.delete({ where: { id } });
}

/** Active STAFF in the department. Staff may only query their own department. */
export async function listStaff(departmentId: number, viewer: AuthUser): Promise<Ref[]> {
  if (viewer.role === "STAFF") {
    if (viewer.departmentId !== departmentId) {
      throw ApiError.forbidden("You can only list staff in your own department");
    }
  }
  const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
  if (!dept) throw ApiError.notFound("Department not found");

  const rows = await prisma.user.findMany({
    where: { role: "STAFF", isActive: true, departmentId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows.map((u) => toRef(u)!);
}

async function findOr404(id: number) {
  const row = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!row) throw ApiError.notFound("Department not found");
}

function uniqueOrThrow(err: unknown): never {
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
    throw ApiError.conflict("A department with this name already exists");
  }
  throw err;
}
