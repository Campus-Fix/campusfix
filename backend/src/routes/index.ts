import { Router } from "express";
import healthRouter from "./health.routes.js";
import authRouter from "./auth.routes.js";

/** All routers are mounted here under `/api` (see app.ts). */
const api = Router();

api.use("/health", healthRouter);
api.use("/auth", authRouter);

export default api;
