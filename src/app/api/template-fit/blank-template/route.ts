import { type NextRequest, NextResponse } from "next/server";
import {
  blankTemplateFilename,
  buildBlankTemplatePdfBytes,
} from "@/lib/template-fit/download-blank-template";
import { BLEED_IN } from "@/lib/template-fit/constants";

/**
 * Server-rendered "blank template" PDF (bleed/trim/safe guides + crop
 * marks) — used by the mobile app, which has no Blob/anchor-download
 * mechanism to trigger a browser save like web's downloadBlankTemplate()
 * does. Reuses the exact same pdf-lib drawing code as the web download so
 * the two platforms' PDFs never drift apart.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const widthIn = Number(params.get("widthIn"));
  const heightIn = Number(params.get("heightIn"));
  const sizeLabel = params.get("sizeLabel") ?? `${widthIn}x${heightIn}`;
  const productTitle = params.get("productTitle") ?? "Design";
  const bleedParam = params.get("bleedIn");
  const bleedIn = bleedParam !== null ? Number(bleedParam) : BLEED_IN;

  if (!Number.isFinite(widthIn) || !Number.isFinite(heightIn) || widthIn <= 0 || heightIn <= 0) {
    return NextResponse.json({ error: "Invalid widthIn/heightIn" }, { status: 400 });
  }

  try {
    const bytes = await buildBlankTemplatePdfBytes(
      widthIn,
      heightIn,
      sizeLabel,
      productTitle,
      Number.isFinite(bleedIn) ? bleedIn : BLEED_IN,
    );
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${blankTemplateFilename(sizeLabel)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not build template PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
