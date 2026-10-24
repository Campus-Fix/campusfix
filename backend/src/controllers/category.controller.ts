import type { Request, Response } from "express";
import * as svc from "../services/category.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

const idOf = (req: Request): number => (req.params as unknown as { id: number }).id;

export async function list(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.listCategories());
}

export async function create(req: Request, res: Response): Promise<void> {
  sendCreated(res, await svc.createCategory(req.body));
}

export async function update(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.updateCategory(idOf(req), req.body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteCategory(idOf(req));
  sendNoContent(res);
}
