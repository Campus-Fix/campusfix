import type { Response } from "express";
import type { ErrorCode, ErrorDetail } from "./ApiError.js";

/** `meta` block for paginated list endpoints (MASTER_PLAN 10.1). */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Success envelope: `{ success: true, data, meta? }`. */
export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: PaginationMeta): void {
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/** Error envelope: `{ success: false, error: { code, message, details? } }`. */
export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): void {
  res.status(status).json({
    success: false,
    error: details && details.length > 0 ? { code, message, details } : { code, message },
  });
}
