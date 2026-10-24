import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

// Single PrismaClient per process. The global cache survives hot reloads under `tsx watch`
// and keeps the pooled (pgbouncer) connection count at 1.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
