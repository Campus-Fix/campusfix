import { z } from "zod";

// Load backend/.env when present (Node >= 20.12). Hosting dashboards (Render) inject env directly,
// and values already present in process.env take precedence over the file.
try {
  process.loadEnvFile();
} catch {
  /* no .env file - rely on process.env */
}

/** Treat empty strings (e.g. `KEY=""` copied from .env.example) as "not set" so defaults apply. */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalString = (fallback: string) => z.preprocess(emptyToUndefined, z.string().default(fallback));

const envSchema = z.object({
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(4000)),
  NODE_ENV: z.preprocess(emptyToUndefined, z.enum(["development", "test", "production"]).default("development")),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required (used by prisma migrate)"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: optionalString("7d"),

  // Comma-separated list of allowed browser origins. Entries may contain a `*` wildcard
  // (e.g. https://*.vercel.app) so Vercel preview deployments work too.
  CORS_ORIGIN: optionalString("http://localhost:5173").transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),

  SUPABASE_URL: z.url({ error: "SUPABASE_URL must be a valid URL" }),
  SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY is required"),
  SUPABASE_BUCKET: optionalString("complaint-images"),

  // Optional on purpose: without a key every AI endpoint degrades to the keyword fallback.
  GEMINI_API_KEY: optionalString(""),
  GEMINI_MODEL: optionalString("gemini-2.5-flash"),
  GEMINI_EMBED_MODEL: optionalString("gemini-embedding-001"),
  AI_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(10_000)),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] Invalid environment configuration. Fix backend/.env (see .env.example):");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
export const isProd = env.NODE_ENV === "production";
