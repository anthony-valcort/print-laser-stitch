/**
 * POST /api/admin/recover-design
 *
 * Shopify's CDN silently re-encodes images into WebP/AVIF when the request
 * signals browser support for those formats (the Accept header a normal
 * <img> fetch sends) — which is why "Save image as…" on an order page gives
 * a lossy copy even though the URL still ends in .png. A plain server-side
 * fetch with no such Accept header gets back the untouched original, so this
 * route re-fetches the given design URL from the server and streams back the
 * original bytes with a forced download.
 */
import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/vehicle-shopify";
import { isAllowedDesignUrl } from "@/lib/allowed-design-hosts";

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop();
    return last && last.length > 0 ? decodeURIComponent(last) : "design-file";
  } catch {
    return "design-file";
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !isAllowedDesignUrl(url)) {
    return NextResponse.json(
      { error: "URL must be a cdn.shopify.com or res.cloudinary.com design file link" },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return NextResponse.json({ error: "Could not reach that URL" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Source returned ${upstream.status}` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const filename = filenameFromUrl(url);

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
