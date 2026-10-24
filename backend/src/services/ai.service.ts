import { Type, type GenerateContentConfig, type Part, type Schema } from "@google/genai";
import type { Priority } from "@prisma/client";
import { z } from "zod";
import { AI_TIMEOUT_MS, GEMINI_MODEL, getGenAI } from "../lib/gemini.js";
import { prisma } from "../lib/prisma.js";
import { refSelect, toRef, type Ref } from "../utils/mappers.js";
import { keywordFallback } from "../utils/keywordFallback.js";
import { getByCategory, getByDepartment, getSummary } from "./analytics.service.js";

/**
 * All Gemini text generation (MASTER_PLAN 11). Every public function here degrades to a rule-based
 * answer instead of throwing when Gemini is missing, slow or returns something unusable.
 * Only complaint text, locations, category/department names and numbers are sent to Gemini (11.5).
 */

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const satisfies readonly Priority[];
const SEVERITIES = ["low", "medium", "high"] as const;
const CATEGORY_CACHE_MS = 5 * 60 * 1000;
const INSIGHTS_CACHE_MS = 10 * 60 * 1000;
const INSIGHTS_FALLBACK_CACHE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TITLE_MAX = 70;

/* ------------------------------------------------------------------ types */

export type AiSource = "ai" | "fallback";

/** Section 10.2 `AiSuggestion`. */
export interface AiSuggestion {
  category: Ref | null;
  department: Ref | null;
  priority: Priority;
  suggestedTitle: string;
  reason: string;
  confidence: number;
  isSafetyIssue: boolean;
  source: AiSource;
}

export interface TriageInput {
  description: string;
  title?: string;
  location?: string;
  image?: { buffer: Buffer; mimeType: string };
}

export interface TriageCategory {
  id: number;
  name: string;
  description: string | null;
  department: Ref;
}

export interface AdminInsight {
  title: string;
  detail: string;
  severity: (typeof SEVERITIES)[number];
}

/** Section 10.4 `GET /ai/insights` payload. */
export interface AdminInsights {
  generatedAt: string;
  headline: string;
  insights: AdminInsight[];
  recommendations: string[];
  source: AiSource;
}

/* --------------------------------------------------------------- helpers */

let categoryCache: { expiresAt: number; data: TriageCategory[] } | null = null;

export async function getTriageCategories(): Promise<TriageCategory[]> {
  if (categoryCache && categoryCache.expiresAt > Date.now()) return categoryCache.data;
  const data = await prisma.category.findMany({
    select: { id: true, name: true, description: true, department: { select: refSelect } },
    orderBy: { id: "asc" },
  });
  categoryCache = { expiresAt: Date.now() + CATEGORY_CACHE_MS, data };
  return data;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Calls Gemini for a JSON response and parses it; rejects on missing key, timeout or invalid JSON. */
async function generateJson(
  contents: Part[] | string,
  config: GenerateContentConfig & { responseSchema: Schema },
): Promise<unknown> {
  const ai = getGenAI();
  if (!ai) throw new Error("GEMINI_API_KEY is not set");

  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini timed out after ${AI_TIMEOUT_MS} ms`));
    }, AI_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          ...config,
          responseMimeType: "application/json",
          abortSignal: controller.signal,
          // Thinking adds seconds of latency on 2.5 Flash and is not needed for classification.
          ...(GEMINI_MODEL.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      timeout,
    ]);
    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response");
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- triage */

const triageOutputSchema = z.object({
  categoryName: z.string(),
  priority: z.enum(PRIORITIES),
  suggestedTitle: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  confidence: z.number(),
  isSafetyIssue: z.boolean(),
});

function triageResponseSchema(categoryNames: string[]): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      categoryName: { type: Type.STRING, enum: categoryNames },
      priority: { type: Type.STRING, enum: [...PRIORITIES] },
      suggestedTitle: { type: Type.STRING },
      reason: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
      isSafetyIssue: { type: Type.BOOLEAN },
    },
    required: ["categoryName", "priority", "suggestedTitle", "reason", "confidence", "isSafetyIssue"],
    propertyOrdering: ["categoryName", "priority", "suggestedTitle", "reason", "confidence", "isSafetyIssue"],
  };
}

function triageSystemPrompt(categories: TriageCategory[]): string {
  const list = categories
    .map((c) => `- ${c.name} (handled by ${c.department.name})${c.description ? `: ${c.description}` : ""}`)
    .join("\n");
  return `You are the triage assistant for CampusFix, a university campus complaint system.
Given a complaint (text and optionally a photo), classify it.

Categories (choose exactly one categoryName from this list):
${list}

Priority rules:
- CRITICAL: immediate safety risk — fire, smoke, sparks, exposed live wires, gas smell, flooding near electricity,
  injury, harassment, security threat, someone stuck in a lift.
- HIGH: essential service down for many people — no water, no power in a block, Wi-Fi down for a whole floor
  or building, bus not arriving, food safety issue.
- MEDIUM: something broken that affects a few people or a single room — one projector, one AC, one leaking tap.
- LOW: cosmetic or minor inconvenience — paint, a squeaky chair, a request or suggestion.

Return JSON only:
- categoryName: one of the listed names
- priority: LOW | MEDIUM | HIGH | CRITICAL
- suggestedTitle: a clear title, max 70 characters, no ticket numbers
- reason: one short sentence explaining the category and priority, written for the student
- confidence: number between 0 and 1
- isSafetyIssue: true only for safety risks

If a photo is provided, use what is visible in it. If the text and photo disagree, prefer the text.`;
}

function triageUserParts(input: TriageInput): Part[] {
  const lines = [
    input.title ? `Title: ${input.title}` : null,
    input.location ? `Location: ${input.location}` : null,
    `Description: ${input.description}`,
  ].filter((line): line is string => line !== null);
  const parts: Part[] = [{ text: lines.join("\n") }];
  if (input.image) {
    parts.push({ inlineData: { mimeType: input.image.mimeType, data: input.image.buffer.toString("base64") } });
  }
  return parts;
}

async function triageWithGemini(input: TriageInput, categories: TriageCategory[]): Promise<AiSuggestion> {
  const raw = await generateJson(triageUserParts(input), {
    systemInstruction: triageSystemPrompt(categories),
    responseSchema: triageResponseSchema(categories.map((c) => c.name)),
    temperature: 0.2,
  });
  const out = triageOutputSchema.parse(raw);

  const category = categories.find((c) => c.name.toLowerCase() === out.categoryName.trim().toLowerCase());
  if (!category) throw new Error(`Gemini returned unknown category "${out.categoryName}"`);

  return {
    category: toRef(category),
    department: toRef(category.department),
    // The UI promises that safety issues are marked CRITICAL.
    priority: out.isSafetyIssue ? "CRITICAL" : out.priority,
    suggestedTitle: out.suggestedTitle.replace(/\s+/g, " ").slice(0, TITLE_MAX).trim(),
    reason: out.reason,
    confidence: clamp01(out.confidence),
    isSafetyIssue: out.isSafetyIssue,
    source: "ai",
  };
}

/** POST /ai/analyze. Never throws: any failure (including DB) returns the keyword fallback. */
export async function analyzeComplaint(input: TriageInput): Promise<AiSuggestion> {
  const started = Date.now();
  let categories: TriageCategory[] = [];
  try {
    categories = await getTriageCategories();
    if (categories.length === 0) throw new Error("No categories in the database");
    const result = await triageWithGemini(input, categories);
    console.info(`[ai] analyze source=ai latency=${Date.now() - started}ms image=${Boolean(input.image)}`);
    return result;
  } catch (err) {
    const result = keywordFallback(input, categories);
    console.warn(`[ai] analyze source=fallback latency=${Date.now() - started}ms reason="${errorMessage(err)}"`);
    return result;
  }
}

/* -------------------------------------------------------------- insights */

const insightsOutputSchema = z.object({
  headline: z.string().trim().min(1),
  insights: z
    .array(z.object({ title: z.string().trim().min(1), detail: z.string().trim().min(1), severity: z.enum(SEVERITIES) }))
    .min(1),
  recommendations: z.array(z.string().trim().min(1)),
});

const insightsResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING },
    insights: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "5",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          severity: { type: Type.STRING, enum: [...SEVERITIES] },
        },
        required: ["title", "detail", "severity"],
        propertyOrdering: ["title", "detail", "severity"],
      },
    },
    recommendations: { type: Type.ARRAY, minItems: "2", maxItems: "4", items: { type: Type.STRING } },
  },
  required: ["headline", "insights", "recommendations"],
  propertyOrdering: ["headline", "insights", "recommendations"],
};

const INSIGHTS_PROMPT =
  "You are an operations analyst for a university facilities office. From this data, write a one-sentence " +
  "headline, 3–5 insights (title, detail, severity: low|medium|high) that mention concrete numbers and locations, " +
  "and 2–4 practical recommendations. JSON only.";

interface WeeklyCategoryCount {
  category: string;
  department: string;
  last7Days: number;
  previous7Days: number;
}

interface InsightsData {
  summary: Awaited<ReturnType<typeof getSummary>>;
  byDepartment: Awaited<ReturnType<typeof getByDepartment>>;
  byCategory: Awaited<ReturnType<typeof getByCategory>>;
  categoryTrend: WeeklyCategoryCount[];
  topUpvotedOpen: { title: string; location: string; category: string; department: string; upvotes: number }[];
}

async function gatherInsightsData(): Promise<InsightsData> {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY_MS);
  const since14 = new Date(now - 14 * DAY_MS);

  const [summary, byDepartment, byCategory, categories, last7, previous7, topOpen] = await Promise.all([
    getSummary(),
    getByDepartment(),
    getByCategory(),
    getTriageCategories(),
    prisma.complaint.groupBy({ by: ["categoryId"], where: { createdAt: { gte: since7 } }, _count: { _all: true } }),
    prisma.complaint.groupBy({
      by: ["categoryId"],
      where: { createdAt: { gte: since14, lt: since7 } },
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: { status: { in: ["SUBMITTED", "IN_PROGRESS"] } },
      orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 5,
      select: {
        title: true,
        location: true,
        category: { select: { name: true } },
        department: { select: { name: true } },
        _count: { select: { upvotes: true } },
      },
    }),
  ]);

  const lastCounts = new Map(last7.map((r) => [r.categoryId, r._count._all]));
  const previousCounts = new Map(previous7.map((r) => [r.categoryId, r._count._all]));
  const categoryTrend = categories
    .map((c) => ({
      category: c.name,
      department: c.department.name,
      last7Days: lastCounts.get(c.id) ?? 0,
      previous7Days: previousCounts.get(c.id) ?? 0,
    }))
    .filter((c) => c.last7Days > 0 || c.previous7Days > 0)
    .sort((a, b) => b.last7Days - a.last7Days);

  return {
    summary,
    byDepartment,
    byCategory,
    categoryTrend,
    topUpvotedOpen: topOpen.map((c) => ({
      title: c.title,
      location: c.location,
      category: c.category.name,
      department: c.department.name,
      upvotes: c._count.upvotes,
    })),
  };
}

async function insightsWithGemini(data: InsightsData): Promise<AdminInsights> {
  const raw = await generateJson(JSON.stringify(data), {
    systemInstruction: INSIGHTS_PROMPT,
    responseSchema: insightsResponseSchema,
    temperature: 0.4,
  });
  const out = insightsOutputSchema.parse(raw);
  return {
    generatedAt: new Date().toISOString(),
    headline: out.headline,
    insights: out.insights.slice(0, 5),
    recommendations: out.recommendations.slice(0, 4),
    source: "ai",
  };
}

function insightsFallback(data: InsightsData): AdminInsights {
  const insights: AdminInsight[] = [];
  const recommendations: string[] = [];
  const headlineParts: string[] = [];

  const topCategory = data.categoryTrend[0];
  if (topCategory && topCategory.last7Days > 0) {
    const { category, department, last7Days, previous7Days } = topCategory;
    const rising = last7Days > previous7Days;
    headlineParts.push(`${category} is the top category this week with ${last7Days} complaints (previous week: ${previous7Days})`);
    insights.push({
      title: `${category} leads this week`,
      detail: `${last7Days} ${category} complaints in the last 7 days versus ${previous7Days} in the 7 days before.`,
      severity: last7Days >= 3 && last7Days >= previous7Days * 2 ? "high" : rising ? "medium" : "low",
    });
    recommendations.push(`Ask ${department} to review the recent ${category} complaints for a common root cause.`);
  }

  const worstDepartment = [...data.byDepartment].sort((a, b) => b.overdue - a.overdue)[0];
  if (worstDepartment && worstDepartment.overdue > 0) {
    headlineParts.push(`${worstDepartment.name} has the most overdue complaints (${worstDepartment.overdue})`);
    insights.push({
      title: `${worstDepartment.name} SLA breaches`,
      detail: `${worstDepartment.name} has ${worstDepartment.overdue} overdue of ${worstDepartment.open} open complaints.`,
      severity: worstDepartment.overdue >= 3 ? "high" : "medium",
    });
    recommendations.push(`Prioritise clearing the ${worstDepartment.overdue} overdue complaints in ${worstDepartment.name}.`);
  }

  const popular = data.topUpvotedOpen[0];
  if (popular && popular.upvotes > 0) {
    insights.push({
      title: "Most upvoted open issue",
      detail: `"${popular.title}" at ${popular.location} has ${popular.upvotes} upvotes and is still open.`,
      severity: popular.upvotes >= 5 ? "medium" : "low",
    });
    recommendations.push(`Give the team handling "${popular.title}" a status update to share with students.`);
  }

  const { summary } = data;
  if (summary.total > 0) {
    insights.push({
      title: "Overall workload",
      detail: `${summary.submitted + summary.inProgress} open, ${summary.overdue} overdue and ${summary.resolved} resolved out of ${summary.total} complaints.`,
      severity: summary.overdue > 0 ? "medium" : "low",
    });
  }

  if (insights.length === 0) {
    insights.push({ title: "Not enough data yet", detail: "No recent complaints to analyse.", severity: "low" });
  }
  if (recommendations.length === 0) recommendations.push("Keep monitoring new complaints as they arrive.");

  return {
    generatedAt: new Date().toISOString(),
    headline: headlineParts.length > 0 ? `${headlineParts.join("; ")}.` : "No notable complaint trends in the last 7 days.",
    insights,
    recommendations,
    source: "fallback",
  };
}

let insightsCache: { expiresAt: number; data: AdminInsights } | null = null;
let insightsInFlight: Promise<AdminInsights> | null = null;

async function generateInsights(): Promise<AdminInsights> {
  const started = Date.now();
  const data = await gatherInsightsData();
  let result: AdminInsights;
  try {
    result = await insightsWithGemini(data);
    console.info(`[ai] insights source=ai latency=${Date.now() - started}ms`);
  } catch (err) {
    result = insightsFallback(data);
    console.warn(`[ai] insights source=fallback latency=${Date.now() - started}ms reason="${errorMessage(err)}"`);
  }
  const ttl = result.source === "ai" ? INSIGHTS_CACHE_MS : INSIGHTS_FALLBACK_CACHE_MS;
  insightsCache = { expiresAt: Date.now() + ttl, data: result };
  return result;
}

/** GET /ai/insights. Cached for 10 minutes (fallback results for 1 minute); `refresh` forces regeneration. */
export async function getInsights({ refresh = false }: { refresh?: boolean } = {}): Promise<AdminInsights> {
  if (!refresh && insightsCache && insightsCache.expiresAt > Date.now()) return insightsCache.data;
  insightsInFlight ??= generateInsights().finally(() => {
    insightsInFlight = null;
  });
  return insightsInFlight;
}
