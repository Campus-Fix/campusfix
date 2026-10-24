import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env, isProd } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

/** Turns a CORS_ORIGIN entry (exact origin or `https://*.vercel.app`) into a matcher. */
function originMatcher(pattern: string): (origin: string) => boolean {
  if (pattern === "*") return () => true;
  if (!pattern.includes("*")) return (origin) => origin === pattern;
  const regex = new RegExp(`^${pattern.split("*").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
  return (origin) => regex.test(origin);
}

const allowedOrigins = env.CORS_ORIGIN.map(originMatcher);

export function isOriginAllowed(origin: string | undefined): boolean {
  // No Origin header = server-to-server, curl, Postman, Render health checks.
  if (!origin) return true;
  return allowedOrigins.some((matches) => matches(origin));
}

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind one reverse proxy; needed for correct client IPs in rate limiting.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    morgan(isProd ? "short" : "dev", {
      skip: (req) => isProd && req.originalUrl === "/api/health",
    }),
  );

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
