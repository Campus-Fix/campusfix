import type { Priority } from "@prisma/client";
import type { AiSuggestion, TriageCategory, TriageInput } from "../services/ai.service.js";
import { toRef } from "./mappers.js";

/**
 * Keyword triage used whenever Gemini is unavailable (MASTER_PLAN 11.2).
 * Each category scores one point per matching pattern; ties go to the rule listed first.
 * Rules reference categories by their seeded name; a rule whose category is missing from the DB is skipped.
 */
const CATEGORY_RULES: { name: string; patterns: RegExp[] }[] = [
  { name: "Wi-Fi & Network", patterns: [/\bwi-?fi\b/, /\binternet\b/, /\bnetwork\b/, /\brouter\b/, /\blan\b/, /\bethernet\b/] },
  {
    name: "Computer Lab & Projectors",
    patterns: [/\bprojector/, /\bcomputers?\b/, /\bpcs?\b/, /\bmonitor/, /\bprinter/, /\bkeyboard/, /\bmouse\b/],
  },
  { name: "Electrical", patterns: [/\bfans?\b/, /\blights?\b/, /\bswitches?\b/, /\bpower\b/, /\bsockets?\b/, /\bwir(e|es|ing)\b/] },
  { name: "Plumbing & Water", patterns: [/\bwater\b/, /\bleak/, /\btaps?\b/, /\bpipes?\b/, /\bdrain/] },
  { name: "Furniture & Infrastructure", patterns: [/\bchairs?\b/, /\bdesks?\b/, /\bbench(es)?\b/, /\bdoors?\b/, /\bwindows?\b/, /\bceiling\b/] },
  { name: "Classroom Facilities", patterns: [/\bclassroom/, /\bwhiteboard/, /\bblackboard/, /\bboard\b/, /\bac\b/, /\bair ?condition/] },
  { name: "Cleanliness", patterns: [/\bdirty\b/, /\bgarbage\b/, /\bdustbins?\b/, /\bsmell/, /\btrash\b/, /\bclean/] },
  { name: "Washrooms", patterns: [/\btoilets?\b/, /\bwashrooms?\b/, /\brestrooms?\b/, /\bbathrooms?\b/] },
  { name: "Bus & Transport", patterns: [/\bbus(es)?\b/, /\bdriver/, /\broute\b/, /\btransport/, /\bshuttle\b/] },
  { name: "Hostel Rooms", patterns: [/\bhostel\b/, /\bbed\b/, /\bmattress/, /\bwarden\b/, /\bcupboard/] },
  { name: "Mess & Food Quality", patterns: [/\bfood\b/, /\bmess\b/, /\bcanteen\b/, /\bmeals?\b/, /\bcafeteria\b/] },
  {
    name: "Safety & Security",
    patterns: [/\bfire\b/, /\bspark/, /\bshock/, /\bharass/, /\bunsafe\b/, /\btheft\b/, /\bstolen\b/, /\bsecurity\b/],
  },
];

const CRITICAL_PATTERNS = [/\bfire\b/, /\bspark/, /\bshock/, /\binjur/, /\bsmoke\b/, /\bgas leak/, /\bharass/, /\bstuck in (the )?lift/];
const HIGH_PATTERNS = [/\bnot working\b/, /\bdown\b/, /\bno water\b/, /\bno power\b/, /\bno electricity\b/, /\boutage\b/];

const TITLE_MAX = 70;

function cleanTitle(description: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  let title = text;
  if (text.length > TITLE_MAX) {
    const cut = text.slice(0, TITLE_MAX);
    const lastSpace = cut.lastIndexOf(" ");
    title = lastSpace > TITLE_MAX / 2 ? cut.slice(0, lastSpace) : cut;
  }
  title = title.replace(/[\s,.;:!?-]+$/, "");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function detectPriority(text: string): Priority {
  if (CRITICAL_PATTERNS.some((p) => p.test(text))) return "CRITICAL";
  if (HIGH_PATTERNS.some((p) => p.test(text))) return "HIGH";
  return "MEDIUM";
}

export function keywordFallback(input: TriageInput, categories: TriageCategory[]): AiSuggestion {
  const text = [input.title, input.description, input.location].filter(Boolean).join(" ").toLowerCase();
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  let best: TriageCategory | null = null;
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    const category = byName.get(rule.name.toLowerCase());
    if (!category) continue;
    const score = rule.patterns.filter((p) => p.test(text)).length;
    // Safety keywords win ties so sparks/fire never lose to Electrical ("switchboard").
    const preferSafety = rule.name === "Safety & Security" && score > 0 && score >= bestScore;
    if (score > bestScore || preferSafety) {
      best = category;
      bestScore = score;
    }
  }

  const priority = detectPriority(text);
  return {
    category: toRef(best),
    department: toRef(best?.department),
    priority,
    suggestedTitle: cleanTitle(input.description),
    reason: "Suggested using keyword matching.",
    confidence: 0.4,
    isSafetyIssue: priority === "CRITICAL",
    source: "fallback",
  };
}
