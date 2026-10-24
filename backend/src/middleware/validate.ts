import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType } from "zod";
import { ApiError, type ErrorDetail } from "../utils/ApiError.js";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function zodIssuesToDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}

/**
 * Validates body / query / params with Zod and replaces them with the parsed (coerced, defaulted) values.
 * All issues from all three sources are collected into one VALIDATION_ERROR response.
 *
 * Express 5 note: `req.query` is a getter on the request prototype, so it is redefined with
 * Object.defineProperty instead of assigned.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: ErrorDetail[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body ?? {});
      if (result.success) req.body = result.data;
      else details.push(...zodIssuesToDetails(result.error));
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query ?? {});
      if (result.success) {
        Object.defineProperty(req, "query", {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        details.push(...zodIssuesToDetails(result.error));
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params ?? {});
      if (result.success) req.params = result.data as Request["params"];
      else details.push(...zodIssuesToDetails(result.error));
    }

    if (details.length > 0) {
      next(ApiError.validation(details[0]!.message, details));
      return;
    }
    next();
  };
}
