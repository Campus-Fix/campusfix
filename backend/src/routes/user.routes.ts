import { Router } from "express";
import * as controller from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createUserBody, idParams, listUsersQuery, updateUserBody } from "../validators/admin.validators.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/", validate({ query: listUsersQuery }), controller.list);
router.post("/", validate({ body: createUserBody }), controller.create);
router.put("/:id", validate({ params: idParams, body: updateUserBody }), controller.update);
router.delete("/:id", validate({ params: idParams }), controller.remove);

export default router;
