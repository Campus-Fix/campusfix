import { Router } from "express";
import * as controller from "../controllers/department.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { departmentBody, idParams, updateDepartmentBody } from "../validators/admin.validators.js";

const router = Router();
router.use(authenticate);

router.get("/", controller.list);
router.get("/:id/staff", authorize("STAFF", "ADMIN"), validate({ params: idParams }), controller.staff);
router.post("/", authorize("ADMIN"), validate({ body: departmentBody }), controller.create);
router.put("/:id", authorize("ADMIN"), validate({ params: idParams, body: updateDepartmentBody }), controller.update);
router.delete("/:id", authorize("ADMIN"), validate({ params: idParams }), controller.remove);

export default router;
