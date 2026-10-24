// STUB – DB member will replace (MASTER_PLAN.md Section 11.3).
// Owner: Member 3 / Database. Keep the exported names and the SimilarComplaint shape (Section 10.2).
// Real implementation: Gemini embedContent (GEMINI_EMBED_MODEL, outputDimensionality 768,
// taskType SEMANTIC_SIMILARITY) + pgvector similarity query from Section 9.6.
import type { ComplaintStatus } from "@prisma/client";

export interface SimilarComplaint {
  id: number;
  ticketCode: string;
  title: string;
  location: string;
  status: ComplaintStatus;
  categoryName: string;
  upvoteCount: number;
  similarity: number;
}

export interface FindSimilarInput {
  title?: string;
  description: string;
  categoryId?: number;
}

/** Embeds arbitrary text; returns a 768-dim vector. */
export async function embedText(_text: string): Promise<number[]> {
  return [];
}

/** Embeds title + description of a complaint and runs `UPDATE complaints SET embedding = $1::vector`. Must never throw. */
export async function embedAndStore(_complaintId: number): Promise<void> {
  // no-op until the DB member's implementation lands
}

/** Open complaints of the last 30 days with similarity >= 0.80, max 5; `[]` on any AI error. */
export async function findSimilar(_input: FindSimilarInput): Promise<SimilarComplaint[]> {
  return [];
}
