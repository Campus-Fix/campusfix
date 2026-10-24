import { rateLimit, type Options } from "express-rate-limit";
import { sendError } from "../utils/response.js";

function createLimiter(options: Partial<Options>, message: string) {
  return rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, "RATE_LIMITED", message),
    ...options,
  });
}

/**
 * /auth/register + /auth/login: 20 per 15 minutes per IP (MASTER_PLAN 13).
 * Only failed attempts count (`skipSuccessfulRequests`) so a demo room sharing one campus IP
 * cannot lock everyone out by logging in successfully many times; brute force is still capped.
 */
export const authLimiter = createLimiter(
  { windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true },
  "Too many login attempts. Please try again in 15 minutes.",
);
