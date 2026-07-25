import { type NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * Renders a QR code as a PNG. Stateless — the payload is whatever the
 * caller passes in, nothing is read from or written to storage. Used by the
 * mobile app (which has no DOM/canvas to render a QR client-side like
 * QrPreview.tsx does on the web) for both the live "while you type" preview
 * and the saved-codes list.
 */
export async function GET(req: NextRequest) {
  const payload = req.nextUrl.searchParams.get("payload") ?? "";
  const sizeParam = Number(req.nextUrl.searchParams.get("size"));
  const size = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.min(sizeParam, 1000) : 300;

  try {
    const png = await QRCode.toBuffer(payload.trim() || " ", {
      width: size,
      margin: 1,
    });
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not render QR code";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
