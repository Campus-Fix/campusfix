import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

/**
 * Gemini client factory.
 * RULE (MASTER_PLAN 11): only services/ai.service.ts and services/duplicate.service.ts may call Gemini.
 * Everything else must go through those services, which fall back gracefully when AI is unavailable.
 */
export const isGeminiConfigured = env.GEMINI_API_KEY.length > 0;
export const GEMINI_MODEL = env.GEMINI_MODEL;
export const GEMINI_EMBED_MODEL = env.GEMINI_EMBED_MODEL;
export const AI_TIMEOUT_MS = env.AI_TIMEOUT_MS;

let client: GoogleGenAI | null = null;

/** Returns the shared client, or `null` when GEMINI_API_KEY is not set (callers must fall back). */
export function getGenAI(): GoogleGenAI | null {
  if (!isGeminiConfigured) return null;
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}
