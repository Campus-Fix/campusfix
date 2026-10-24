import type { Request, Response } from "express";
import { trackByCode } from "../services/complaint.service.js";
import { sendSuccess } from "../utils/response.js";

/** GET /track/:ticketCode — public, no names/emails/notes/images. */
export async function track(req: Request, res: Response): Promise<void> {
  const { ticketCode } = req.params as { ticketCode: string };
  sendSuccess(res, await trackByCode(ticketCode));
}
