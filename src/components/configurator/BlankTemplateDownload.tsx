"use client";

import { useState } from "react";
import type { ShopifyOption } from "@/lib/shopify-products";
import { findDimensionOption, parseSizeInches } from "@/lib/parse-size";
import { downloadBlankTemplate } from "@/lib/template-fit/download-blank-template";

export default function BlankTemplateDownload({
  options,
  productTitle,
}: {
  options: ShopifyOption[];
  productTitle: string;
}) {
  const sizeOption = findDimensionOption(options);
  const sizeValues = sizeOption
    ? sizeOption.values.filter((v) => parseSizeInches(v) !== null)
    : [];

  const [selected, setSelected] = useState(sizeValues[0] ?? "");
  const [busy, setBusy] = useState(false);

  if (!sizeOption || sizeValues.length === 0) return null;

  async function handleDownload() {
    const dims = parseSizeInches(selected);
    if (!dims) return;
    setBusy(true);
    try {
      await downloadBlankTemplate(dims.width, dims.height, selected, productTitle);
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
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {sizeValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
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
