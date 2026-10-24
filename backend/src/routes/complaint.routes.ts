import { Router } from "express";
import * as controller from "../controllers/complaint.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { uploadComplaintImages } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  assignBody,
  changeStatusBody,
  complaintIdParams,
  createComplaintBody,
  feedQuery,
  feedbackBody,
  imageParams,
  listComplaintsQuery,
  updateComplaintBody,
} from "../validators/complaint.validators.js";

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listComplaintsQuery }), controller.list);
router.get("/feed", validate({ query: feedQuery }), controller.feed);
// multer must run before body validation so multipart text fields exist on req.body
router.post("/", uploadComplaintImages, validate({ body: createComplaintBody }), controller.create);

router.get("/:id", validate({ params: complaintIdParams }), controller.detail);
router.put("/:id", validate({ params: complaintIdParams, body: updateComplaintBody }), controller.update);
router.delete("/:id", validate({ params: complaintIdParams }), controller.remove);

router.post("/:id/images", validate({ params: complaintIdParams }), uploadComplaintImages, controller.addImages);
router.delete("/:id/images/:imageId", validate({ params: imageParams }), controller.removeImage);

router.patch(
  "/:id/status",
  authorize("STAFF", "ADMIN"),
  validate({ params: complaintIdParams, body: changeStatusBody }),
  controller.changeStatus,
);
router.patch(
  "/:id/assign",
  authorize("STAFF", "ADMIN"),
  validate({ params: complaintIdParams, body: assignBody }),
  controller.assign,
);
router.post("/:id/upvote", validate({ params: complaintIdParams }), controller.upvote);
router.delete("/:id/upvote", validate({ params: complaintIdParams }), controller.removeUpvote);
router.post(
  "/:id/feedback",
  validate({ params: complaintIdParams, body: feedbackBody }),
  controller.feedback,
);

export default router;
