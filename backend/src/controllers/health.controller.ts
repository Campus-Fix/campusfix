import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/response.js";

/** GET /api/health - public; also used to wake the Render instance before the demo. */
export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, {
    status: "ok",
    service: "campusfix-api",
    env: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
