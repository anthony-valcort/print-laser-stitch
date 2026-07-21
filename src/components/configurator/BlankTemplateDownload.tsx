"use client";

import { useState } from "react";
import type { ShopifyOption } from "@/lib/shopify-products";
import { findDimensionOption, parseSizeInches } from "@/lib/parse-size";
import { downloadBlankTemplate } from "@/lib/template-fit/download-blank-template";

export default function BlankTemplateDownload({
  options,
  productTitle,
  fixedSizeInches,
}: {
  options: ShopifyOption[];
  productTitle: string;
  /** Fallback for products with one fixed size but no Size option to pick
   * from (e.g. Business Cards, always 2×3.5″) — see the matching prop on
   * GenericProductConfigurator. */
  fixedSizeInches?: { width: number; height: number };
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
    const dims = showPicker ? parseSizeInches(selected) : fixedSizeInches;
    if (!dims) return;
    setBusy(true);
    try {
      await downloadBlankTemplate(
        dims.width,
        dims.height,
        showPicker ? selected : (fixedLabel ?? ""),
        productTitle,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border-soft bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        Design offline?
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Download a blank template with bleed &amp; safe lines and build your
        design in your own software.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showPicker && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {sizeValues.map((v) => (
              <option key={v} value={v} style={{ backgroundColor: "#1e1e1e", color: "#f5f5f5" }}>
                {v}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          className="rounded-md border border-border-soft bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
        >
          {busy ? "Generating…" : "⬇ Download Blank Template (PDF)"}
        </button>
      </div>
    </div>
  );
}
