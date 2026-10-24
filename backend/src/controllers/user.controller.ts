import type { Request, Response } from "express";
import * as svc from "../services/user.service.js";
import { requireUser } from "../middleware/auth.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

const idOf = (req: Request): number => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response): Promise<void> {
  const { data, meta } = await svc.listUsers(req.query as never);
  sendSuccess(res, data, 200, meta);
}

export async function create(req: Request, res: Response): Promise<void> {
  sendCreated(res, await svc.createUser(req.body));
}

export async function update(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.updateUser(idOf(req), req.body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deactivateUser(idOf(req), requireUser(req));
  sendNoContent(res);
}
