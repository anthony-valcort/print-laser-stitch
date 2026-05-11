"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DECAL_MATERIALS,
  PANEL_TYPES,
  TAX_RATE,
  calcDecalPrice,
  type MaterialKey,
  type PanelType,
} from "@/lib/decal-pricing";
import { useCart } from "@/lib/cart-store";
import type { DecalCartItem, DecalPanelLine } from "@/lib/cart-types";

type Panel = {
  id: string;
  type: PanelType;
  width: string;
  height: string;
  description: string;
};

const EMPTY_PANEL_FORM = {
  type: "door" as PanelType,
  width: "",
  height: "",
  description: "",
};

export default function DecalCalculator() {
  const router = useRouter();
  const { addItem } = useCart();

  const [panels, setPanels] = useState<Panel[]>([]);
  const [form, setForm] = useState(EMPTY_PANEL_FORM);
  const [material, setMaterial] = useState<MaterialKey>("perforated-film");
  const [discountPercent, setDiscountPercent] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const currentMaterial =
    DECAL_MATERIALS.find((m) => m.key === material) ?? DECAL_MATERIALS[0];

  const result = useMemo(
    () =>
      calcDecalPrice({
        panels: panels.map((p) => ({
          type: p.type,
          width: Number(p.width) || 0,
          height: Number(p.height) || 0,
          description: p.description,
        })),
        material,
        discountPercent: Number(discountPercent) || 0,
      }),
    [panels, material, discountPercent],
  );

  function addPanel() {
    const w = Number(form.width);
    const h = Number(form.height);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
      setToast("Please enter valid width and height in inches.");
      return;
    }
    setPanels((prev) => [
      ...prev,
      {
        id: `panel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: form.type,
        width: form.width,
        height: form.height,
        description: form.description.trim(),
      },
    ]);
    setForm(EMPTY_PANEL_FORM);
    setToast(null);
  }

  function removePanel(id: string) {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }

  function handleAddToCart() {
    if (panels.length === 0) {
      setToast("Add at least one panel first.");
      return;
    }
    if (result.quoteOnly) {
      setToast(
        "Special Vinyl needs a custom quote — please call (772) 985-2854.",
      );
      return;
    }
    setToast(null);

    const panelLines: DecalPanelLine[] = panels.map((p) => {
      const typeLabel =
        PANEL_TYPES.find((t) => t.key === p.type)?.label ?? p.type;
      return {
        type: p.type,
        typeLabel,
        width: Number(p.width),
        height: Number(p.height),
        description: p.description || undefined,
      };
    });

    const cartItem: Omit<DecalCartItem, "id" | "addedAt"> = {
      kind: "decal",
      title: `Quick Quote · ${currentMaterial.label}`,
      subtitle: `${panelLines.length} ${panelLines.length === 1 ? "panel" : "panels"} · ${result.totalAreaSqFt.toFixed(2)} sq ft`,
      thumbnail: "🪟",
      unitLabel: `$${result.pricePerSqFt.toFixed(2)} / sq ft`,
      totalPrice: result.total,
      quantity: panelLines.length,
      panels: panelLines,
      material,
      materialLabel: currentMaterial.label,
      discountPercent: Number(discountPercent) || 0,
      pricePerSqFt: result.pricePerSqFt,
      totalAreaSqFt: result.totalAreaSqFt,
      subtotal: result.subtotal,
      taxAmount: result.taxAmount,
      notes: notes.trim() || undefined,
      editHref: "/decal-quote",
    };

    addItem(cartItem);
    router.push("/cart");
  }

  return (
    <section className="relative">
      {/* Breadcrumb */}
      <div className="border-b border-border-soft bg-background-soft/60">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 text-xs sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-1 text-foreground-muted hover:text-foreground"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Home
          </Link>
          <span className="text-foreground-muted/40">/</span>
          <span className="font-medium">Quick Quote</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Quick Quote{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              — Manual Entry
            </span>
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Add panels manually by entering dimensions and descriptions.
          </p>
        </div>

        <div className="space-y-6">
          {/* Add Panel */}
          <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
            <h2 className="mb-4 text-base font-bold text-highlight">
              Add Panel
            </h2>

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Panel Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {PANEL_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition ${
                      form.type === t.key
                        ? "border-cyan-400 bg-cyan-500/15"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField
                label="Width (inches)"
                value={form.width}
                onChange={(v) => setForm((f) => ({ ...f, width: v }))}
                placeholder="Enter width"
                required
              />
              <NumberField
                label="Height (inches)"
                value={form.height}
                onChange={(v) => setForm((f) => ({ ...f, height: v }))}
                placeholder="Enter height"
                required
              />
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Description (Optional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g., Front entrance, Side window"
                className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                suppressHydrationWarning
              />
            </div>

            <button
              type="button"
              onClick={addPanel}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-highlight px-4 py-3 text-sm font-bold text-yellow-950 transition hover:brightness-105 sm:w-auto"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Panel
            </button>
          </section>

          {/* Panels list */}
          <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
            {panels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-soft bg-white/3 px-5 py-10 text-center text-sm text-foreground-muted">
                No panels added yet. Add your first panel above.
              </div>
            ) : (
              <ul className="space-y-2">
                {panels.map((p, idx) => {
                  const w = Number(p.width) || 0;
                  const h = Number(p.height) || 0;
                  const sqft = (w * h) / 144;
                  const panelPrice =
                    sqft * currentMaterial.pricePerSqFt;
                  const typeLabel =
                    PANEL_TYPES.find((t) => t.key === p.type)?.label ?? p.type;
                  const typeIcon =
                    PANEL_TYPES.find((t) => t.key === p.type)?.icon ?? "📐";
                  return (
                    <li
                      key={p.id}
                      className="rounded-xl border border-border-soft bg-white/3 p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="text-xl">{typeIcon}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">
                              {typeLabel} {idx + 1}
                            </div>
                            {p.description && (
                              <div className="text-[11px] text-foreground-muted">
                                {p.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePanel(p.id)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-[10px] uppercase text-foreground-muted">
                            Width
                          </div>
                          <div className="font-mono">{w}″</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-foreground-muted">
                            Height
                          </div>
                          <div className="font-mono">{h}″</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-foreground-muted">
                            Area
                          </div>
                          <div className="font-mono">{sqft.toFixed(2)} sq ft</div>
                        </div>
                      </div>
                      {!currentMaterial.quoteOnly && (
                        <div className="mt-2 flex items-center justify-between border-t border-border-soft pt-2">
                          <span className="text-[11px] text-foreground-muted">
                            Price
                          </span>
                          <span className="font-mono text-sm font-bold text-cyan-300">
                            ${panelPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Material & Pricing */}
          <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-highlight">
              <span>♦♦</span>
              <span>Material &amp; Pricing</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {DECAL_MATERIALS.map((m) => {
                const active = material === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMaterial(m.key)}
                    className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <div className="text-sm font-bold">{m.label}</div>
                    {m.quoteOnly ? (
                      <div className="text-sm font-bold text-rose-300">
                        Custom Pricing
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-cyan-300">
                        ${m.pricePerSqFt.toFixed(2)}/sq ft
                      </div>
                    )}
                    <div className="text-[11px] text-foreground-muted">
                      {m.blurb}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Live Quote Summary */}
          <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-highlight">
              <span>📋</span>
              <span>Live Quote Summary</span>
            </h2>

            {panels.length === 0 ? (
              <div className="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-foreground-muted">
                No quote available yet
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-cyan-200">
                      Material: {currentMaterial.label}
                    </span>
                    {!currentMaterial.quoteOnly && (
                      <span className="font-mono font-bold text-cyan-300">
                        ${currentMaterial.pricePerSqFt.toFixed(2)}/sq ft
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-3 rounded-xl bg-white/5 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Measured Area</span>
                    <span className="font-mono font-bold">
                      {result.totalAreaSqFt.toFixed(2)} sq ft
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground-muted">Subtotal:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      ${result.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="text-foreground-muted">
                      Discount (%):
                    </label>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      min={0}
                      max={100}
                      className="w-32 rounded-lg border border-cyan-400/40 bg-white/4 px-3 py-1.5 text-right text-sm outline-none ring-highlight/40 focus:ring-2"
                      suppressHydrationWarning
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-foreground-muted">
                      Tax ({(TAX_RATE * 100).toFixed(0)}% Martin County):
                    </span>
                    <span className="font-mono font-bold text-cyan-300">
                      ${result.taxAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3 text-lg">
                    <span className="font-black">Total:</span>
                    <span className="font-mono font-black text-highlight">
                      ${result.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {!result.quoteOnly && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="mt-5 w-full rounded-2xl bg-highlight px-5 py-3 text-sm font-bold text-yellow-950 shadow-lg shadow-highlight/20 transition hover:brightness-105"
                  >
                    Add to Cart · ${result.total.toFixed(2)}
                  </button>
                )}
                {result.quoteOnly && (
                  <a
                    href="tel:7729852854"
                    className="mt-5 block w-full rounded-2xl border border-rose-400/40 bg-rose-500/15 px-5 py-3 text-center text-sm font-bold text-rose-100 hover:bg-rose-500/25"
                  >
                    📞 Call (772) 985-2854 for custom quote
                  </a>
                )}

                {toast && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    {toast}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Project Notes */}
          <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-highlight">
              <span>📝</span>
              <span>Project Notes</span>
            </h2>
            <p className="mb-3 text-xs text-foreground-muted">
              Add any project details — install location, deadline, special
              instructions, etc.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Special instructions for installation…"
              className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
              suppressHydrationWarning
            />
          </section>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={0}
        step={1}
        className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
        suppressHydrationWarning
      />
    </label>
  );
}
