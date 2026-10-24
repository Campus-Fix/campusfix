import type { Request, Response } from "express";
import * as svc from "../services/complaint.service.js";
import { requireUser } from "../middleware/auth.js";
import { filesFrom } from "../middleware/upload.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";
import type {
  CreateComplaintInput,
  FeedQuery,
  ListComplaintsQuery,
  UpdateComplaintInput,
} from "../validators/complaint.validators.js";

/** `validate({ params })` has already coerced `:id` to a number. */
const idOf = (req: Request): number => (req.params as unknown as { id: number }).id;

/** GET /complaints */
export async function list(req: Request, res: Response): Promise<void> {
  const { data, meta } = await svc.listComplaints(req.query as unknown as ListComplaintsQuery, requireUser(req));
  sendSuccess(res, data, 200, meta);
}

/** GET /complaints/feed */
export async function feed(req: Request, res: Response): Promise<void> {
  const { data, meta } = await svc.feedComplaints(req.query as unknown as FeedQuery, requireUser(req));
  sendSuccess(res, data, 200, meta);
}

/** POST /complaints (multipart) -> 201 ComplaintDetail */
export async function create(req: Request, res: Response): Promise<void> {
  const detail = await svc.createComplaint(req.body as CreateComplaintInput, filesFrom(req), requireUser(req));
  sendCreated(res, detail);
}

/** GET /complaints/:id */
export async function detail(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.getComplaint(idOf(req), requireUser(req)));
}

/** PUT /complaints/:id */
export async function update(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.updateComplaint(idOf(req), req.body as UpdateComplaintInput, requireUser(req)));
}

/** DELETE /complaints/:id -> 204 */
export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteComplaint(idOf(req), requireUser(req));
  sendNoContent(res);
}

/** POST /complaints/:id/images (multipart) */
export async function addImages(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.addImages(idOf(req), filesFrom(req), requireUser(req)));
}

/** DELETE /complaints/:id/images/:imageId */
export async function removeImage(req: Request, res: Response): Promise<void> {
  const { id, imageId } = req.params as unknown as { id: number; imageId: number };
  sendSuccess(res, await svc.removeImage(id, imageId, requireUser(req)));
}

/** PATCH /complaints/:id/status */
export async function changeStatus(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.changeStatus(idOf(req), req.body, requireUser(req)));
}

/** PATCH /complaints/:id/assign */
export async function assign(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.assignComplaint(idOf(req), req.body, requireUser(req)));
}

/** POST /complaints/:id/upvote */
export async function upvote(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.addUpvote(idOf(req), requireUser(req)));
}

/** DELETE /complaints/:id/upvote */
export async function removeUpvote(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await svc.removeUpvote(idOf(req), requireUser(req)));
}

/** POST /complaints/:id/feedback -> 201 { feedback } */
export async function feedback(req: Request, res: Response): Promise<void> {
  sendCreated(res, { feedback: await svc.addFeedback(idOf(req), req.body, requireUser(req)) });
}
