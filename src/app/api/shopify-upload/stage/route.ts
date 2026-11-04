import { type NextRequest, NextResponse } from "next/server";
import { createStagedUpload, ALLOWED_UPLOAD_FORMATS } from "@/lib/cloudinary-files";

// No file-size cap here on purpose: customers upload large-format artwork
// (6x4 ft banners) and the proof step re-uploads a print-resolution PNG that
// is far bigger than the original. The only limits are Cloudinary's own.

type StageRequest = {
  filename: string;
  mimeType: string;
  fileSize: number;
};

/**
 * Phase 1 of the design-file upload — request a signed Cloudinary upload
 * target. Browser will then POST the actual file directly to Cloudinary
 * using the returned `url` and `parameters`. After upload completes, browser
 * calls /api/shopify-upload/register to look up the permanent delivery URL.
 */
export async function POST(req: NextRequest) {
  let body: StageRequest;
  try {
    body = (await req.json()) as StageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.filename || !body.mimeType || !body.fileSize) {
    return NextResponse.json(
      { error: "Missing fields: filename, mimeType, fileSize" },
      { status: 400 },
    );
  }

  const MIME_TO_EXT: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
    "image/svg+xml": "svg", "application/pdf": "pdf",
    "application/postscript": "ai", "video/mp4": "mp4",
    "video/quicktime": "mov", "video/webm": "webm",
  };
  const nameExt = body.filename.includes(".")
    ? (body.filename.split(".").pop() ?? "").toLowerCase()
    : "";
  const ext = nameExt || MIME_TO_EXT[body.mimeType] || "";
  if (!ALLOWED_UPLOAD_FORMATS.includes(ext)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PNG, JPG, WEBP, SVG, PDF or AI." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(body.fileSize) || body.fileSize <= 0) {
    return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
  }

  try {
    const target = await createStagedUpload(body.filename);
    return NextResponse.json(target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create staged upload";
    const status = msg.startsWith("Server not configured") ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
