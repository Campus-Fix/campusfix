import type { Request, Response } from "express";
import * as aiService from "../services/ai.service.js";
import { findSimilar } from "../services/duplicate.service.js";
import { sendSuccess } from "../utils/response.js";
import type { AnalyzeInput, DuplicatesInput, InsightsQuery } from "../validators/ai.schema.js";

/** POST /ai/analyze -> AiSuggestion */
export async function analyze(req: Request, res: Response): Promise<void> {
  const body = req.body as AnalyzeInput;
  const suggestion = await aiService.analyzeComplaint({
    description: body.description,
    title: body.title,
    location: body.location,
    image: req.file ? { buffer: req.file.buffer, mimeType: req.file.mimetype } : undefined,
  });
  sendSuccess(res, suggestion);
}

/** POST /ai/duplicates -> SimilarComplaint[] */
export async function duplicates(req: Request, res: Response): Promise<void> {
  const similar = await findSimilar(req.body as DuplicatesInput);
  sendSuccess(res, similar);
}

/** GET /ai/insights -> AdminInsights */
export async function insights(req: Request, res: Response): Promise<void> {
  const { refresh } = req.query as unknown as InsightsQuery;
  sendSuccess(res, await aiService.getInsights({ refresh }));
}
