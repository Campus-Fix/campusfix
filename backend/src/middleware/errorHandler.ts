import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { isProd } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { sendError } from "../utils/response.js";
import { zodIssuesToDetails } from "./validate.js";

/** Mounted after all routes: unknown paths become a NOT_FOUND envelope. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  expose?: boolean;
  type?: string;
  name?: string;
  message?: string;
}

function prismaTarget(meta: Record<string, unknown> | undefined): string | undefined {
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(", ");
  if (typeof target === "string") return target;
  return undefined;
}

/**
 * Central error handler (MASTER_PLAN 10.1 / 13). Maps:
 *  - ApiError               -> its own status/code
 *  - ZodError               -> 400 VALIDATION_ERROR
 *  - Prisma P2002/P2025/P2003 -> 409 / 404 / 409
 *  - Multer limits          -> 400 VALIDATION_ERROR
 *  - JSON body parse errors -> 400 VALIDATION_ERROR
 *  - JWT errors             -> 401 UNAUTHORIZED
 *  - anything else          -> 500 INTERNAL_ERROR (no stack traces in production)
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = zodIssuesToDetails(err);
    sendError(res, 400, "VALIDATION_ERROR", details[0]?.message ?? "Validation failed", details);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const field = prismaTarget(err.meta);
        sendError(
          res,
          409,
          "CONFLICT",
          field ? `A record with this ${field} already exists` : "A record with these values already exists",
        );
        return;
      }
      case "P2025":
        sendError(res, 404, "NOT_FOUND", "Resource not found");
        return;
      case "P2003":
        sendError(
          res,
          409,
          "CONFLICT",
          "This action conflicts with related records: a referenced record is missing or still in use",
        );
        return;
      default:
        break; // fall through to INTERNAL_ERROR
    }
  }

  if (err instanceof multer.MulterError) {
    const field = err.field ?? "images";
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT"
          ? "Too many files uploaded"
          : err.code === "LIMIT_UNEXPECTED_FILE"
            ? `Unexpected file field "${field}" or too many files`
            : err.message;
    sendError(res, 400, "VALIDATION_ERROR", message, [{ path: field, message }]);
    return;
  }

  const httpErr = (typeof err === "object" && err !== null ? err : {}) as HttpLikeError;

  if (httpErr.type === "entity.parse.failed") {
    sendError(res, 400, "VALIDATION_ERROR", "Malformed JSON body");
    return;
  }
  if (httpErr.type === "entity.too.large") {
    sendError(res, 400, "VALIDATION_ERROR", "Request body too large (max 1 MB)");
    return;
  }
  if (httpErr.name === "JsonWebTokenError" || httpErr.name === "TokenExpiredError" || httpErr.name === "NotBeforeError") {
    sendError(res, 401, "UNAUTHORIZED", httpErr.name === "TokenExpiredError" ? "Token expired" : "Invalid token");
    return;
  }
  // Other exposed client errors raised by Express/body-parser (e.g. unsupported charset).
  const exposedStatus = httpErr.status ?? httpErr.statusCode;
  if (httpErr.expose === true && typeof exposedStatus === "number" && exposedStatus >= 400 && exposedStatus < 500) {
    sendError(res, 400, "VALIDATION_ERROR", httpErr.message ?? "Bad request");
    return;
  }

  // Unknown error: log fully on the server, never expose internals to the client in production.
  console.error("[error] Unhandled error:", err);
  const message = !isProd && httpErr.message ? httpErr.message : "Something went wrong";
  sendError(res, 500, "INTERNAL_ERROR", message);
};
