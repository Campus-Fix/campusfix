import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema, updateMeSchema } from "../validators/auth.validators.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
router.get("/me", authenticate, controller.me);
router.put("/me", authenticate, validate({ body: updateMeSchema }), controller.updateMe);

export default router;
