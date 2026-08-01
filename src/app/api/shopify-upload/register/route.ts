import { type NextRequest, NextResponse } from "next/server";
import { registerUploadedFile } from "@/lib/cloudinary-files";

type RegisterRequest = {
  resourceUrl: string;
  filename: string;
  mimeType: string;
};

/**
 * Phase 2 of the design-file upload — look up the file uploaded straight to
 * Cloudinary in phase 1 and return its permanent, untransformed delivery URL.
 */
export async function POST(req: NextRequest) {
  let body: RegisterRequest;
  try {
    body = (await req.json()) as RegisterRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.resourceUrl || !body.filename) {
    return NextResponse.json(
      { error: "Missing fields: resourceUrl, filename" },
      { status: 400 },
    );
  }

  try {
    const result = await registerUploadedFile(body.resourceUrl, body.filename);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not register file";
    const status = msg.startsWith("Server not configured")
      ? 500
      : msg.includes("not ready in time")
        ? 504
        : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
