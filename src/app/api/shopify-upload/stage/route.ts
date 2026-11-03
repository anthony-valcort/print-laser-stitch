import { type NextRequest, NextResponse } from "next/server";
import { createStagedUpload, ALLOWED_UPLOAD_FORMATS } from "@/lib/cloudinary-files";

const VIDEO_FORMATS = new Set(["mp4", "mov", "webm"]);
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB (site advertises 20 MB)
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB, gallery videos

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
  const maxBytes = VIDEO_FORMATS.has(ext) ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
  if (!Number.isFinite(body.fileSize) || body.fileSize <= 0 || body.fileSize > maxBytes) {
    return NextResponse.json(
      { error: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).` },
      { status: 400 },
    );
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
