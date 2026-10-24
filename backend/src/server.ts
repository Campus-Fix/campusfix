import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { isGeminiConfigured } from "./lib/gemini.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[server] CampusFix API listening on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
  console.log(`[server] CORS origins: ${env.CORS_ORIGIN.join(", ")}`);
  if (!isGeminiConfigured) {
    console.warn("[server] GEMINI_API_KEY is not set - AI endpoints will use the keyword fallback");
  }
});

// Non-fatal connectivity probe so a bad DATABASE_URL shows up in the logs immediately.
prisma
  .$queryRaw`SELECT 1`
  .then(() => console.log("[db] Connected to PostgreSQL"))
  .catch((err: unknown) => {
    const reason =
      err instanceof Error
        ? (err.message.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("Invalid `prisma")) ?? err.message)
        : String(err);
    console.warn(`[db] Could not reach the database: ${reason}`);
  });

function shutdown(signal: string) {
  console.log(`[server] ${signal} received, shutting down gracefully`);
  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
  // Force exit if connections do not drain in time (Render sends SIGTERM on redeploy).
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
