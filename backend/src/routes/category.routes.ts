import { Router } from "express";
import * as controller from "../controllers/category.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { categoryBody, idParams, updateCategoryBody } from "../validators/admin.validators.js";

const router = Router();
router.use(authenticate);

router.get("/", controller.list);
router.post("/", authorize("ADMIN"), validate({ body: categoryBody }), controller.create);
router.put("/:id", authorize("ADMIN"), validate({ params: idParams, body: updateCategoryBody }), controller.update);
router.delete("/:id", authorize("ADMIN"), validate({ params: idParams }), controller.remove);

export default router;
