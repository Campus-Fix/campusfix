import { randomUUID } from "node:crypto";
import { STORAGE_BUCKET, supabase } from "../lib/supabase.js";
import { ApiError } from "../utils/ApiError.js";

export interface UploadedImage {
  url: string;
  path: string;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads to Supabase Storage at `complaints/{uuid}.{ext}` and returns public URLs.
 * If any upload fails, the ones that succeeded are removed and a 500 is thrown (MASTER_PLAN 10.4).
 */
export async function uploadImages(files: Express.Multer.File[]): Promise<UploadedImage[]> {
  if (files.length === 0) return [];

  const results = await Promise.allSettled(
    files.map(async (file): Promise<UploadedImage> => {
      const path = `complaints/${randomUUID()}.${EXTENSIONS[file.mimetype] ?? "bin"}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, path };
    }),
  );

  const uploaded = results.filter((r): r is PromiseFulfilledResult<UploadedImage> => r.status === "fulfilled").map((r) => r.value);
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

  if (failed.length > 0) {
    console.error("[storage] upload failed:", failed.map((f) => String(f.reason)).join("; "));
    await deleteFiles(uploaded.map((u) => u.path));
    throw ApiError.internal("Image upload failed. Please try again.");
  }
  return uploaded;
}

/** Best-effort removal; never throws (used for cleanup paths). Empty paths (seeded Unsplash URLs) are skipped. */
export async function deleteFiles(paths: string[]): Promise<void> {
  const real = paths.filter((p) => p && p.trim().length > 0);
  if (real.length === 0) return;
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(real);
    if (error) console.warn("[storage] delete failed:", error.message);
  } catch (err) {
    console.warn("[storage] delete failed:", err instanceof Error ? err.message : err);
  }
}
