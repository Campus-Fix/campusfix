import { Router } from "express";
import multer from "multer";
import * as controller from "../controllers/ai.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../utils/ApiError.js";
import { analyzeSchema, duplicatesSchema, insightsQuerySchema } from "../validators/ai.schema.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Single optional photo for triage (MASTER_PLAN 10.4 / 13): jpg/png/webp, 5 MB, memory only. */
const analyzeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const message = "Only JPG, PNG or WebP images are allowed";
    cb(ApiError.validation(message, [{ path: "image", message }]));
  },
});

const router = Router();

router.post(
  "/analyze",
  authenticate,
  aiLimiter,
  analyzeUpload.single("image"),
  validate({ body: analyzeSchema }),
  controller.analyze,
);
router.post("/duplicates", authenticate, aiLimiter, validate({ body: duplicatesSchema }), controller.duplicates);
router.get(
  "/insights",
  authenticate,
  authorize("ADMIN"),
  aiLimiter,
  validate({ query: insightsQuerySchema }),
  controller.insights,
);

export default router;
