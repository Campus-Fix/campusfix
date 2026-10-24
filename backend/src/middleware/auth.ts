import type { Request, RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { findAuthUser, verifyToken } from "../services/auth.service.js";
import type { AuthUser } from "../utils/mappers.js";

/**
 * Verifies the Bearer JWT, loads the user from the DB (so role/department changes and
 * deactivation take effect immediately) and attaches it as `req.user`.
 * Deactivated users get 401 so the frontend interceptor clears the stale token.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Authentication required");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw ApiError.unauthorized("Authentication required");

  const claims = verifyToken(token);
  const user = await findAuthUser(claims.sub);
  if (!user) throw ApiError.unauthorized("This account no longer exists");
  if (!user.isActive) throw ApiError.unauthorized("Your account has been deactivated");

  req.user = user;
  next();
};

/** Role gate. Must run after `authenticate`. */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized("Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden("You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

/** For controllers behind `authenticate`: returns the typed user or throws 401. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  return req.user;
}
