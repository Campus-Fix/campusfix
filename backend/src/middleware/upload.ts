import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_COMPLAINT = 3;

const storage = multer.memoryStorage();

function imageFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) cb(null, true);
  else cb(ApiError.validation("Only JPG, PNG or WebP images are allowed", [{ path: file.fieldname, message: "Unsupported file type" }]));
}

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_COMPLAINT },
});

/** `images` field, up to 3 files (POST /complaints, POST /complaints/:id/images). */
export const uploadComplaintImages = upload.array("images", MAX_IMAGES_PER_COMPLAINT);

/** `image` field, single optional file (POST /ai/analyze). */
export const uploadSingleImage = upload.single("image");

export function filesFrom(req: { files?: unknown }): Express.Multer.File[] {
  return Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
}
