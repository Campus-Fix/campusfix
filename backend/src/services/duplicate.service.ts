import { ComplaintStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getGenAI, GEMINI_EMBED_MODEL } from '../lib/gemini.js';

export interface SimilarComplaint {
  id: number;
  ticketCode: string;
  title: string;
  location: string;
  status: ComplaintStatus;
  categoryName: string;
  upvoteCount: number;
  similarity: number; // 0..1
}

export interface FindSimilarParams {
  title?: string;
  description: string;
  categoryId?: number;
}

/**
 * Generate 768-dimensional semantic embedding for text using Google Gemini.
 * Never throws — returns empty array on failure or when API key is missing.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) return [];

    const ai = getGenAI();
    if (!ai) {
      console.warn('[duplicate.service] Gemini not configured. Skipping text embedding.');
      return [];
    }

    const response = await ai.models.embedContent({
      model: GEMINI_EMBED_MODEL,
      contents: text.trim(),
      config: {
        outputDimensionality: 768,
        taskType: 'SEMANTIC_SIMILARITY',
      },
    });

    const values = response.embeddings?.[0]?.values ?? [];
    return values;
  } catch (err) {
    console.error('[duplicate.service] embedText failed:', err);
    return [];
  }
}

/**
 * Fetch a complaint's title and description, generate embedding, and store in pgvector column.
 * Designed for background execution (unawaited). Never throws.
 */
export async function embedAndStore(complaintId: number): Promise<void> {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, title: true, description: true },
    });

    if (!complaint) {
      console.warn(`[duplicate.service] Complaint ${complaintId} not found for embedding.`);
      return;
    }

    const textToEmbed = `${complaint.title}\n${complaint.description}`;
    const vector = await embedText(textToEmbed);

    if (!vector || vector.length !== 768) {
      console.warn(`[duplicate.service] Did not receive 768-dim vector for complaint ${complaintId} (got ${vector?.length || 0}).`);
      return;
    }

    const vectorStr = `[${vector.join(',')}]`;
    await prisma.$executeRaw`
      UPDATE complaints
      SET embedding = ${vectorStr}::vector
      WHERE id = ${complaintId};
    `;

    console.log(`[duplicate.service] Successfully saved embedding for complaint ${complaintId}.`);
  } catch (err) {
    console.error(`[duplicate.service] embedAndStore failed for complaint ${complaintId}:`, err);
  }
}

/**
 * Find similar open complaints (SUBMITTED, IN_PROGRESS) in the last 30 days.
 * Minimum similarity threshold: 0.80.
 * Prioritizes complaints in the same category if categoryId is provided.
 * Never throws — returns empty array on error or AI unavailability.
 */
export async function findSimilar(params: FindSimilarParams): Promise<SimilarComplaint[]> {
  try {
    const { title, description, categoryId } = params;
    const textToEmbed = title ? `${title}\n${description}` : description;

    const vector = await embedText(textToEmbed);
    if (!vector || vector.length !== 768) {
      return [];
    }

    const vectorStr = `[${vector.join(',')}]`;

    // Reference query from Master Plan Section 9.6
    const rows = await prisma.$queryRaw<any[]>`
      SELECT x.id, x.ticket_code, x.title, x.location, x.status,
             c.name AS category_name,
             c.id AS category_id,
             (SELECT COUNT(*) FROM upvotes u WHERE u.complaint_id = x.id) AS upvote_count,
             1 - (x.embedding <=> ${vectorStr}::vector) AS similarity
      FROM complaints x
      JOIN categories c ON c.id = x.category_id
      WHERE x.embedding IS NOT NULL
        AND x.status IN ('SUBMITTED', 'IN_PROGRESS')
        AND x.created_at >= now() - interval '30 days'
      ORDER BY x.embedding <=> ${vectorStr}::vector
      LIMIT 10;
    `;

    // Filter by threshold 0.80
    const filtered = rows
      .map((r) => ({
        id: Number(r.id),
        ticketCode: String(r.ticket_code),
        title: String(r.title),
        location: String(r.location),
        status: r.status as ComplaintStatus,
        categoryName: String(r.category_name),
        categoryId: Number(r.category_id),
        upvoteCount: Number(r.upvote_count),
        similarity: Number(Number(r.similarity).toFixed(4)),
      }))
      .filter((r) => r.similarity >= 0.8);

    // If categoryId is specified, rank same-category complaints first, then by descending similarity
    filtered.sort((a, b) => {
      if (categoryId) {
        const aSame = a.categoryId === categoryId ? 1 : 0;
        const bSame = b.categoryId === categoryId ? 1 : 0;
        if (aSame !== bSame) return bSame - aSame;
      }
      return b.similarity - a.similarity;
    });

    return filtered.slice(0, 5).map(({ categoryId: _, ...rest }) => rest);
  } catch (err) {
    console.error('[duplicate.service] findSimilar failed:', err);
    return [];
  }
}
