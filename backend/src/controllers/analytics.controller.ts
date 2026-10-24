import type { Request, Response } from "express";
import * as analytics from "../services/analytics.service.js";
import { requireUser } from "../middleware/auth.js";
import { sendSuccess } from "../utils/response.js";

/** Staff calls are automatically scoped to their own department (Section 10.3). */
function scopeDept(req: Request): number | undefined {
  const user = requireUser(req);
  if (user.role === "STAFF") return user.departmentId ?? -1;
  return undefined;
}

export async function summary(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await analytics.getSummary(scopeDept(req)));
}

export async function byCategory(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await analytics.getByCategory(scopeDept(req)));
}

export async function byDepartment(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await analytics.getByDepartment());
}

export async function trend(req: Request, res: Response): Promise<void> {
  const { days } = req.query as unknown as { days: number };
  sendSuccess(res, await analytics.getTrend(days, scopeDept(req)));
}

export async function aiAccuracy(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await analytics.getAiAccuracy());
}
