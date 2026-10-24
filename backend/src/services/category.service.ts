import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { toRef } from "../utils/mappers.js";
import type { Category } from "../types/api.js";

const include = { department: { select: { id: true, name: true } }, _count: { select: { complaints: true } } } as const;

function toCategory(row: {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  slaHours: number;
  department: { id: number; name: string };
  _count: { complaints: number };
}): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    slaHours: row.slaHours,
    department: toRef(row.department)!,
    complaintCount: row._count.complaints,
  };
}

export async function listCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ include, orderBy: { name: "asc" } });
  return rows.map(toCategory);
}

export async function createCategory(input: {
  name: string;
  description?: string | null;
  icon?: string | null;
  slaHours: number;
  departmentId: number;
}): Promise<Category> {
  await assertDepartment(input.departmentId);
  try {
    const row = await prisma.category.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        slaHours: input.slaHours,
        departmentId: input.departmentId,
      },
      include,
    });
    return toCategory(row);
  } catch (err) {
    throw uniqueOrThrow(err, "A category with this name already exists");
  }
}

export async function updateCategory(
  id: number,
  input: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    slaHours?: number;
    departmentId?: number;
  },
): Promise<Category> {
  await findOr404(id);
  if (input.departmentId !== undefined) await assertDepartment(input.departmentId);
  try {
    const row = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.slaHours !== undefined ? { slaHours: input.slaHours } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      },
      include,
    });
    return toCategory(row);
  } catch (err) {
    throw uniqueOrThrow(err, "A category with this name already exists");
  }
}

export async function deleteCategory(id: number): Promise<void> {
  const row = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { complaints: true } } },
  });
  if (!row) throw ApiError.notFound("Category not found");
  if (row._count.complaints > 0) {
    throw ApiError.conflict(`Cannot delete "${row.name}" because ${row._count.complaints} complaint(s) still use it`);
  }
  await prisma.category.delete({ where: { id } });
}

async function findOr404(id: number) {
  const row = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!row) throw ApiError.notFound("Category not found");
}

async function assertDepartment(departmentId: number) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
  if (!dept) throw ApiError.validation("Department not found", [{ path: "departmentId", message: "Department not found" }]);
}

function uniqueOrThrow(err: unknown, message: string): never {
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
    throw ApiError.conflict(message);
  }
  throw err;
}
