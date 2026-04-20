import { put } from "@vercel/blob";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return apiError("Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN env var.", 500);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return apiError("No file uploaded", 400);

    if (!ALLOWED.includes(file.type)) {
      return apiError(`Unsupported type. Allowed: ${ALLOWED.join(", ")}`, 400);
    }
    if (file.size > MAX_BYTES) {
      return apiError(`File too large. Max ${MAX_BYTES / 1024 / 1024}MB.`, 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const blob = await put(safeName, file, {
      access: "public",
      contentType: file.type,
    });

    return apiSuccess({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return apiError(msg, 500);
  }
}
