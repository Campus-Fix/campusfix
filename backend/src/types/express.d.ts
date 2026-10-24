import type { AuthUser } from "../utils/mappers.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate`. Never contains passwordHash. */
      user?: AuthUser;
    }
  }
}

export {};
