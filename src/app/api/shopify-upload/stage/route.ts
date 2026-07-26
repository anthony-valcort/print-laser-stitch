import { type NextRequest, NextResponse } from "next/server";
import { createStagedUpload } from "@/lib/shopify-files";

type StageRequest = {
  filename: string;
  mimeType: string;
  fileSize: number;
};

/**
 * Phase 1 of Shopify Files upload — request a staged upload target.
 * Browser will then POST the actual file directly to Shopify's GCS bucket
 * using the returned `url` and `parameters`. After upload completes, browser
 * calls /api/shopify-upload/register to register the file with Shopify Files.
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
    const target = await createStagedUpload(body.filename, body.mimeType, body.fileSize);
    return NextResponse.json(target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create staged upload";
    const status = msg.startsWith("Server not configured") ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
