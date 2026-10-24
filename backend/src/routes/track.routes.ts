import { Router } from "express";
import { track } from "../controllers/track.controller.js";
import { validate } from "../middleware/validate.js";
import { ticketCodeParams } from "../validators/complaint.validators.js";

const router = Router();
router.get("/:ticketCode", validate({ params: ticketCodeParams }), track);
export default router;
