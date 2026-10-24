import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { requireUser } from "../middleware/auth.js";
import { toPublicUser } from "../utils/mappers.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import type { LoginInput, RegisterInput, UpdateMeInput } from "../validators/auth.validators.js";

/** POST /auth/register -> 201 { token, user } */
export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body as RegisterInput);
  sendCreated(res, result);
}

/** POST /auth/login -> 200 { token, user } */
export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);
  sendSuccess(res, result);
}

/** GET /auth/me -> { user } */
export function me(req: Request, res: Response): void {
  sendSuccess(res, { user: toPublicUser(requireUser(req)) });
}

/** PUT /auth/me -> { user } */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = await authService.updateMe(requireUser(req), req.body as UpdateMeInput);
  sendSuccess(res, { user });
}
