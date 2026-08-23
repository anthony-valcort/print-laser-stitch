"use client";

import { useState } from "react";
import type { ShopifyOption } from "@/lib/shopify-products";
import {
  findDimensionOption,
  parseSizeInches,
  parseSizeInchesWithUnit,
  type SizeUnit,
} from "@/lib/parse-size";
import { downloadBlankTemplate } from "@/lib/template-fit/download-blank-template";

/** Mobile-web sibling of BlankTemplateDownload.tsx — same data/logic, but a
 * touch-friendly card layout (size chips instead of a cramped <select>,
 * bigger tap target on the button) instead of reusing the desktop markup
 * shrunk down. Shown only below `lg`; desktop keeps the original. */
export default function BlankTemplateDownloadMobile({
  options,
  productTitle,
  fixedSizeInches,
  sizeUnit = "in",
  bleedIn,
}: {
  options: ShopifyOption[];
  productTitle: string;
  fixedSizeInches?: { width: number; height: number };
  sizeUnit?: SizeUnit;
  bleedIn?: number;
}) {
  const sizeOption = findDimensionOption(options);
  const sizeValues = sizeOption
    ? sizeOption.values.filter((v) => parseSizeInches(v) !== null)
    : [];
  const fixedLabel = fixedSizeInches
    ? `${fixedSizeInches.width}" x ${fixedSizeInches.height}"`
    : null;

  const [selected, setSelected] = useState(sizeValues[0] ?? fixedLabel ?? "");
  const [busy, setBusy] = useState(false);

  if (sizeValues.length === 0 && !fixedLabel) return null;
  const showPicker = sizeValues.length > 0;

  async function handleDownload() {
    const dims = showPicker
      ? parseSizeInchesWithUnit(selected, sizeUnit)
      : fixedSizeInches;
    if (!dims) return;
    setBusy(true);
    try {
      await downloadBlankTemplate(
        dims.width,
        dims.height,
        showPicker ? selected : (fixedLabel ?? ""),
        productTitle,
        bleedIn,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border-soft bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#18d3e8]/10 text-[#18d3e8]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Design offline?
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
            Download a blank template with bleed &amp; safe lines and build
            your design in your own software.
          </p>
        </div>
      </div>

      {showPicker && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sizeValues.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelected(v)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                selected === v
                  ? "border-[#18d3e8] bg-[#18d3e8]/10 text-[#18d3e8]"
                  : "border-border-soft bg-white/5 text-foreground/80 hover:bg-white/10"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#18d3e8]/30 bg-[#18d3e8]/5 px-4 py-3 text-sm font-semibold text-[#18d3e8] transition hover:bg-[#18d3e8]/10 disabled:opacity-60"
      >
        {busy ? (
          "Generating…"
        ) : (
          <>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Blank Template (PDF)
          </>
        )}
      </button>
    </div>
  );
}
