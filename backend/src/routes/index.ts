import { Router } from "express";
import healthRouter from "./health.routes.js";
import authRouter from "./auth.routes.js";
import complaintRouter from "./complaint.routes.js";
import trackRouter from "./track.routes.js";
import categoryRouter from "./category.routes.js";
import departmentRouter from "./department.routes.js";
import userRouter from "./user.routes.js";
import analyticsRouter from "./analytics.routes.js";
import aiRouter from "./ai.routes.js";

/** All routers are mounted here under `/api` (see app.ts). */
const api = Router();

api.use("/health", healthRouter);
api.use("/auth", authRouter);
api.use("/complaints", complaintRouter);
api.use("/track", trackRouter);
api.use("/categories", categoryRouter);
api.use("/departments", departmentRouter);
api.use("/users", userRouter);
api.use("/analytics", analyticsRouter);
api.use("/ai", aiRouter);

export default api;
