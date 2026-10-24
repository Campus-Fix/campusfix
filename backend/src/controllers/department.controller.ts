import type { Request, Response } from "express";
import * as svc from "../services/department.service.js";
import { requireUser } from "../middleware/auth.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

const idOf = (req: Request): number => (req.params as unknown as { id: number }).id;

export async function list(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.listDepartments());
}

export async function create(req: Request, res: Response): Promise<void> {
  sendCreated(res, await svc.createDepartment(req.body));
}

export async function update(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.updateDepartment(idOf(req), req.body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteDepartment(idOf(req));
  sendNoContent(res);
}

export async function staff(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.listStaff(idOf(req), requireUser(req)));
}
