"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DECAL_MATERIALS,
  PANEL_TYPES,
  SERVICE_PLANS,
  TAX_RATE,
  calcDecalPrice,
  type MaterialKey,
  type PanelType,
  type ServicePlanKey,
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
  const [material, setMaterial] = useState<MaterialKey>("standard-vinyl");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const currentMaterial =
    DECAL_MATERIALS.find((m) => m.key === material) ?? DECAL_MATERIALS[0];

  // Compute totals for ALL three service plans at once so the customer can
  // compare them side-by-side — that's the whole point of this calculator
  // per Anthony's spec.
  const planResults = useMemo(() => {
    return SERVICE_PLANS.map((plan) => ({
      plan,
      result: calcDecalPrice({
        panels: panels.map((p) => ({
          type: p.type,
          width: Number(p.width) || 0,
          height: Number(p.height) || 0,
          description: p.description,
        })),
        servicePlan: plan.key,
        material,
        discountPercent,
      }),
    }));
  }, [panels, material, discountPercent]);

  // Shared metrics (same across all 3 plans — area, material, etc.)
  const totalAreaSqFt = planResults[0]?.result.totalAreaSqFt ?? 0;
  const quoteOnly = currentMaterial.quoteOnly === true;

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

  function addPlanToCart(planKey: ServicePlanKey) {
    if (panels.length === 0) {
      setToast("Add at least one panel first.");
      return;
    }
    if (quoteOnly) {
      setToast(
        "Special Vinyl requires a custom quote — please call (772) 985-2854.",
      );
      return;
    }
    const match = planResults.find((pr) => pr.plan.key === planKey);
    if (!match) return;
    const { plan, result } = match;

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
      title: `${currentMaterial.label} · ${plan.label}`,
      subtitle: `${panelLines.length} ${panelLines.length === 1 ? "panel" : "panels"} · ${result.totalAreaSqFt.toFixed(2)} sq ft`,
      thumbnail: "🪟",
      unitLabel: `$${result.pricePerSqFt.toFixed(2)} / sq ft`,
      totalPrice: result.total,
      quantity: panelLines.length,
      panels: panelLines,
      servicePlan: plan.key,
      servicePlanLabel: plan.label,
      material,
      materialLabel: currentMaterial.label,
      discountPercent,
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
          <span className="font-medium">Decal Quote</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Window film · Wall vinyl · Decals
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Decal Quote{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Calculator
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
            Add each panel you want covered, pick a material, and see pricing
            for all three service tiers — choose the one that fits.
          </p>
        </div>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          {/* LEFT: Configurator */}
          <div className="min-w-0 space-y-6">
            {/* Add Panel */}
            <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Add a panel</h2>
                <span className="text-[11px] text-foreground-muted">
                  Dimensions in inches
                </span>
              </div>

              <div className="mb-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Panel type
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {PANEL_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition ${
                        form.type === t.key
                          ? "border-highlight bg-highlight-soft"
                          : "border-border-soft bg-white/3 hover:bg-white/6"
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-[11px] font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <InputField
                  label="Width (in)"
                  value={form.width}
                  onChange={(v) => setForm((f) => ({ ...f, width: v }))}
                  type="number"
                  placeholder="36"
                />
                <InputField
                  label="Height (in)"
                  value={form.height}
                  onChange={(v) => setForm((f) => ({ ...f, height: v }))}
                  type="number"
                  placeholder="72"
                />
                <InputField
                  label="Description (optional)"
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                  placeholder="Front entrance"
                  wide
                />
              </div>

              <button
                type="button"
                onClick={addPanel}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-highlight px-4 py-3 text-sm font-semibold text-yellow-950 transition hover:brightness-105 sm:w-auto"
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
                Add panel
              </button>
            </section>

            {/* Panels list */}
            <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Your panels</h2>
                <span className="text-[11px] text-foreground-muted">
                  {panels.length}{" "}
                  {panels.length === 1 ? "panel" : "panels"} ·{" "}
                  {totalAreaSqFt.toFixed(2)} sq ft total
                </span>
              </div>

              {panels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-soft bg-white/3 px-5 py-8 text-center text-sm text-foreground-muted">
                  No panels added yet. Add your first panel above.
                </div>
              ) : (
                <ul className="space-y-2">
                  {panels.map((p) => {
                    const w = Number(p.width) || 0;
                    const h = Number(p.height) || 0;
                    const sqft = (w * h) / 144;
                    const typeLabel =
                      PANEL_TYPES.find((t) => t.key === p.type)?.label ?? p.type;
                    const typeIcon =
                      PANEL_TYPES.find((t) => t.key === p.type)?.icon ?? "📐";
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-xl border border-border-soft bg-white/3 px-3 py-2.5 text-sm sm:px-4"
                      >
                        <span className="text-xl">{typeIcon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {typeLabel} · {w}″ × {h}″
                          </div>
                          <div className="text-[11px] text-foreground-muted">
                            {sqft.toFixed(2)} sq ft
                            {p.description ? ` · ${p.description}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePanel(p.id)}
                          aria-label="Remove panel"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-foreground-muted hover:bg-red-500/10 hover:text-red-300"
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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Material */}
            <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold">Material & Pricing</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {DECAL_MATERIALS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMaterial(m.key)}
                    className={`flex items-start justify-between gap-2 rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
                      material === m.key
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-[11px] text-foreground-muted">
                        {m.blurb}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {m.quoteOnly ? (
                        <span className="text-xs font-bold text-rose-300">
                          Custom Pricing
                        </span>
                      ) : m.pricePerSqFt > 0 ? (
                        <span className="text-xs font-bold text-cyan-300">
                          ${m.pricePerSqFt.toFixed(2)}/sqft
                        </span>
                      ) : (
                        <span className="text-[11px] text-foreground-muted">
                          Plan rate applies
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Discount + notes */}
            <section className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold">
                Discount & project notes
              </h2>
              <div className="mb-3 max-w-xs">
                <InputField
                  label="Discount (%)"
                  value={String(discountPercent)}
                  onChange={(v) =>
                    setDiscountPercent(
                      Math.max(0, Math.min(100, Number(v) || 0)),
                    )
                  }
                  type="number"
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Project notes (optional)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Install location, deadline, special instructions…"
                  className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </label>
            </section>

          </div>

          {/* RIGHT: 3-tier price comparison */}
          <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <div className="space-y-4">
              {/* Header summary */}
              <div className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Live Quote Summary
                </div>
                <div className="mt-2 text-sm font-medium">
                  {currentMaterial.label}
                </div>
                <div className="mt-3 grid gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-xs text-foreground-muted">
                  <div className="flex items-center justify-between">
                    <span>Panels</span>
                    <span className="font-mono text-foreground">
                      {panels.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total area</span>
                    <span className="font-mono text-foreground">
                      {totalAreaSqFt.toFixed(2)} sq ft
                    </span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex items-center justify-between text-emerald-300">
                      <span>Discount applied</span>
                      <span className="font-mono">{discountPercent}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Sales tax</span>
                    <span className="font-mono text-foreground">
                      {(TAX_RATE * 100).toFixed(0)}% (Martin County)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 service tier price cards */}
              {quoteOnly ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-center">
                  <div className="text-2xl">🎨</div>
                  <div className="mt-2 text-sm font-semibold text-rose-200">
                    Special Vinyl
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted">
                    This material needs a custom quote.
                  </p>
                  <a
                    href="tel:7729852854"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30"
                  >
                    📞 (772) 985-2854
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Choose a service tier
                  </div>
                  {planResults.map(({ plan, result }, idx) => {
                    const accent =
                      idx === 0
                        ? "border-border-soft hover:border-foreground/30"
                        : idx === 1
                          ? "border-cyan-500/40 hover:border-cyan-400/60"
                          : "border-highlight/40 hover:border-highlight/60";
                    const badge =
                      idx === 1
                        ? "Popular"
                        : idx === 2
                          ? "Hands-off"
                          : null;
                    const buttonStyle =
                      idx === 2
                        ? "bg-highlight text-yellow-950 hover:brightness-105"
                        : idx === 1
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-95"
                          : "border border-border-strong bg-white/5 text-foreground hover:bg-white/10";

                    return (
                      <div
                        key={plan.key}
                        className={`overflow-hidden rounded-2xl border ${accent} bg-surface p-4 transition`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">
                                {plan.label}
                              </span>
                              {badge && (
                                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                                  {badge}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] text-foreground-muted">
                              {plan.description}
                            </div>
                            <div className="mt-1 text-[11px] font-mono text-foreground-muted">
                              ${result.pricePerSqFt.toFixed(2)}/sq ft
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-2xl font-bold text-white">
                              ${result.total.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-foreground-muted">
                              incl. tax
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addPlanToCart(plan.key)}
                          disabled={panels.length === 0}
                          className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${buttonStyle}`}
                        >
                          {panels.length === 0
                            ? "Add a panel first"
                            : `Add to Cart`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {toast && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {toast}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 1 : undefined}
        className="w-full rounded-xl border border-border-soft bg-white/4 px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2 sm:px-4 sm:py-3"
        suppressHydrationWarning
      />
    </label>
  );
}
