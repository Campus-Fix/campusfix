import { Router } from "express";
import * as controller from "../controllers/analytics.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { trendQuery } from "../validators/admin.validators.js";

const router = Router();
router.use(authenticate, authorize("STAFF", "ADMIN"));

router.get("/summary", controller.summary);
router.get("/by-category", controller.byCategory);
router.get("/trend", validate({ query: trendQuery }), controller.trend);
router.get("/by-department", authorize("ADMIN"), controller.byDepartment);
router.get("/ai-accuracy", authorize("ADMIN"), controller.aiAccuracy);

export default router;
