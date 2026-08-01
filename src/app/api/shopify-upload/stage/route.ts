import { type NextRequest, NextResponse } from "next/server";
import { createStagedUpload } from "@/lib/cloudinary-files";

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

  try {
    const target = await createStagedUpload(body.filename);
    return NextResponse.json(target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create staged upload";
    const status = msg.startsWith("Server not configured") ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
