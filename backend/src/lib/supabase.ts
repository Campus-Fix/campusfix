import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Service-role client: backend only. Never expose this key or client to the frontend.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export const STORAGE_BUCKET = env.SUPABASE_BUCKET;
