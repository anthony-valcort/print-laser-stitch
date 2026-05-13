"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  SERVICE_PLANS,
  calcSignageQuotePrice,
  type MeasurementUnit,
  type ServicePlanKey,
} from "@/lib/signage-pricing";
import { useCart } from "@/lib/cart-store";
import type { SignageCartItem } from "@/lib/cart-types";

const PLAN_VISUALS: Record<
  ServicePlanKey,
  {
    icon: string;
    accent: string;
    selectedRing: string;
    glow: string;
    perks: string[];
  }
> = {
  "print-only": {
    icon: "🖨️",
    accent: "from-[#18d3e8] to-[#14b8ce]",
    selectedRing: "ring-[#18d3e8]/60 border-[#18d3e8]/60",
    glow: "shadow-[0_0_40px_rgba(24,211,232,0.35)]",
    perks: ["High-resolution print", "You handle install"],
  },
  "design-print": {
    icon: "✏️",
    accent: "from-[#d94cb3] to-[#b83a96]",
    selectedRing: "ring-[#d94cb3]/60 border-[#d94cb3]/60",
    glow: "shadow-[0_0_40px_rgba(217,76,179,0.35)]",
    perks: ["Custom artwork", "Free proof", "Print included"],
  },
  "full-install": {
    icon: "🚀",
    accent: "from-[#d9f000] to-[#b8cc00]",
    selectedRing: "ring-[#d9f000]/60 border-[#d9f000]/60",
    glow: "shadow-[0_0_40px_rgba(217,240,0,0.35)]",
    perks: ["Design + print", "Pro installation", "Hands-off"],
  },
};

export default function SignageCalculator() {
  const router = useRouter();
  const { addItem } = useCart();

  const [unit, setUnit] = useState<MeasurementUnit>("ft");
  const [width, setWidth] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<string>("0");
  const [servicePlan, setServicePlan] =
    useState<ServicePlanKey>("full-install");
  const [notes, setNotes] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  const result = useMemo(
    () =>
      calcSignageQuotePrice({
        width: Number(width) || 0,
        length: Number(length) || 0,
        unit,
        quantity,
        servicePlan,
        discountPercent: Number(discountPercent) || 0,
      }),
    [width, length, unit, quantity, servicePlan, discountPercent],
  );

  const w = Number(width) || 0;
  const l = Number(length) || 0;
  const dimsEntered = w > 0 && l > 0;
  const currentPlan =
    SERVICE_PLANS.find((p) => p.key === servicePlan) ?? SERVICE_PLANS[0];

  function handleAddToCart() {
    if (!dimsEntered) {
      setToast("Enter both width and length first.");
      return;
    }
    setToast(null);

    const cartItem: Omit<SignageCartItem, "id" | "addedAt"> = {
      kind: "signage",
      title: `Decal Signage · ${currentPlan.label}`,
      subtitle: `${w}${unit} × ${l}${unit} · qty ${quantity}`,
      thumbnail: "🪧",
      unitLabel: `$${result.pricePerSqFt.toFixed(2)} / sq ft`,
      totalPrice: result.total,
      quantity,
      width: w,
      length: l,
      unit,
      qty: quantity,
      servicePlan: currentPlan.key,
      servicePlanLabel: currentPlan.label,
      pricePerSqFt: result.pricePerSqFt,
      unitAreaSqFt: result.unitAreaSqFt,
      totalAreaSqFt: result.totalAreaSqFt,
      discountPercent: Number(discountPercent) || 0,
      subtotal: result.subtotal,
      notes: notes.trim() || undefined,
      editHref: "/signage-quotes",
    };

    addItem(cartItem);
    router.push("/cart");
  }

  return (
    <section className="relative overflow-x-clip">
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-160 w-240 -translate-x-1/2 rounded-full bg-linear-to-r from-[#d9f000]/10 via-[#18d3e8]/10 to-[#d94cb3]/10 blur-3xl" />

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground"
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
          Back to home
        </Link>

        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
            Print &amp; install quote generator
          </span>
          <h1 className="mt-5 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">
            Decal{" "}
            <span className="bg-linear-to-r from-[#d9f000] via-[#18d3e8] to-[#d94cb3] bg-clip-text text-transparent">
              Signage
            </span>{" "}
            Calculator
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-foreground-muted sm:text-base">
            Tell us the size, pick a service tier, get your price instantly.
          </p>
        </div>
      </div>

      {/* Calculator body */}
      <div className="mx-auto max-w-7xl px-3 pb-16 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
          {/* LEFT — Inputs */}
          <div className="min-w-0 space-y-5">
            {/* Dimensions card */}
            <section className="group relative overflow-hidden rounded-3xl border border-border-soft bg-linear-to-br from-surface to-surface-elevated p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#18d3e8]/10 blur-3xl" />

              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-headline text-xs font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-[#18d3e8]/15">
                      1
                    </span>
                    Dimensions
                  </div>
                  <h2 className="mt-2 text-xl font-bold">Size your sign</h2>
                </div>

                {/* Unit toggle */}
                <div className="relative inline-flex rounded-full border border-border-soft bg-background/60 p-1 text-xs font-semibold backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setUnit("ft")}
                    className={`relative z-10 rounded-full px-4 py-1.5 transition ${
                      unit === "ft"
                        ? "bg-linear-to-r from-[#18d3e8] to-[#14b8ce] text-black shadow-md shadow-[#18d3e8]/30"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    Feet
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit("in")}
                    className={`relative z-10 rounded-full px-4 py-1.5 transition ${
                      unit === "in"
                        ? "bg-linear-to-r from-[#18d3e8] to-[#14b8ce] text-black shadow-md shadow-[#18d3e8]/30"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    Inches
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BigInput
                  label="Width"
                  value={width}
                  onChange={setWidth}
                  unitSuffix={unit}
                  placeholder="0"
                />
                <BigInput
                  label="Length"
                  value={length}
                  onChange={setLength}
                  unitSuffix={unit}
                  placeholder="0"
                />
              </div>

              {/* Quantity + Discount */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Quantity
                  </label>
                  <div className="flex items-center gap-1 rounded-2xl border border-border-soft bg-background/60 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-foreground-muted hover:bg-white/10"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-lg font-bold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-foreground-muted hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Discount (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      min={0}
                      max={100}
                      step={1}
                      placeholder="0"
                      className="w-full rounded-2xl border border-border-soft bg-background/60 px-4 py-3 text-center text-lg font-bold tabular-nums outline-none ring-[#18d3e8]/40 focus:ring-2"
                      suppressHydrationWarning
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign preview */}
              {dimsEntered && (
                <div className="mt-6 rounded-2xl border border-border-soft bg-background/40 p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-foreground-muted">
                    <span>Visual preview</span>
                    <span className="font-mono text-foreground">
                      {result.unitAreaSqFt.toFixed(2)} sq ft each
                    </span>
                  </div>
                  <SignPreview w={w} l={l} unit={unit} />
                </div>
              )}
            </section>

            {/* Service tier card */}
            <section className="relative overflow-hidden rounded-3xl border border-border-soft bg-linear-to-br from-surface to-surface-elevated p-6 sm:p-8">
              <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#d94cb3]/10 blur-3xl" />

              <div className="mb-5">
                <div className="flex items-center gap-2 font-headline text-xs font-semibold uppercase tracking-[0.2em] text-[#d94cb3]">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-[#d94cb3]/15">
                    2
                  </span>
                  Service tier
                </div>
                <h2 className="mt-2 text-xl font-bold">
                  How much help do you need?
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {SERVICE_PLANS.map((plan) => {
                  const active = servicePlan === plan.key;
                  const v = PLAN_VISUALS[plan.key];
                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setServicePlan(plan.key)}
                      className={`group/card relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all ${
                        active
                          ? `${v.selectedRing} bg-linear-to-br from-white/10 to-white/0 shadow-lg ${v.glow}`
                          : "border-border-soft bg-background/40 hover:border-border-strong hover:bg-white/5"
                      }`}
                    >
                      {/* Selected check */}
                      {active && (
                        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-linear-to-r from-[#d9f000] to-[#18d3e8] text-black">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}

                      <div
                        className={`grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br ${v.accent} text-2xl shadow-lg ${v.glow}`}
                      >
                        {v.icon}
                      </div>
                      <div className="mt-4 text-sm font-bold">{plan.label}</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-black tabular-nums">
                          ${plan.pricePerSqFt}
                        </span>
                        <span className="text-[11px] text-foreground-muted">
                          / sq ft
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {v.perks.map((perk) => (
                          <li
                            key={perk}
                            className="flex items-center gap-1.5 text-[11px] text-foreground/80"
                          >
                            <span className="grid h-3 w-3 shrink-0 place-items-center rounded-full bg-white/10">
                              <svg
                                width="7"
                                height="7"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Notes card */}
            <section className="rounded-3xl border border-border-soft bg-linear-to-br from-surface to-surface-elevated p-6 sm:p-8">
              <div className="mb-3">
                <div className="flex items-center gap-2 font-headline text-xs font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-[#d9f000]/15">
                    3
                  </span>
                  Optional notes
                </div>
                <h2 className="mt-2 text-lg font-bold">
                  Anything we should know?
                </h2>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Install location, deadline, special instructions…"
                className="w-full resize-none rounded-2xl border border-border-soft bg-background/60 px-4 py-3 text-sm placeholder:text-foreground-muted/60 outline-none ring-[#d9f000]/40 focus:ring-2"
                suppressHydrationWarning
              />
            </section>
          </div>

          {/* RIGHT — Sticky quote summary */}
          <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <div
              className={`relative overflow-hidden rounded-3xl border bg-linear-to-br p-6 transition-all ${
                dimsEntered
                  ? `${PLAN_VISUALS[servicePlan].selectedRing} from-background to-surface-elevated shadow-2xl ${PLAN_VISUALS[servicePlan].glow}`
                  : "border-border-soft from-surface to-surface-elevated"
              }`}
            >
              {/* Ambient gradient */}
              <div
                className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-linear-to-br opacity-30 blur-3xl ${
                  dimsEntered
                    ? PLAN_VISUALS[servicePlan].accent
                    : "from-transparent to-transparent"
                }`}
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Your quote
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full bg-linear-to-r ${PLAN_VISUALS[servicePlan].accent} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black`}
                  >
                    {PLAN_VISUALS[servicePlan].icon} {currentPlan.label}
                  </span>
                </div>

                {!dimsEntered ? (
                  <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-border-soft bg-white/3 px-4 py-12 text-center">
                    <div className="text-5xl opacity-50">📐</div>
                    <p className="mt-4 text-sm text-foreground-muted">
                      Enter width and length to see your quote
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Big total */}
                    <div className="mt-6">
                      <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Grand total
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-5xl font-black tabular-nums tracking-tight">
                          ${result.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-foreground-muted">
                        {result.totalAreaSqFt.toFixed(2)} sq ft total ·{" "}
                        ${result.pricePerSqFt.toFixed(2)}/sq ft
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="mt-5 space-y-2 rounded-2xl bg-background/40 p-4 text-sm">
                      <Row
                        label="Each panel"
                        value={`${result.unitAreaSqFt.toFixed(2)} sq ft`}
                      />
                      <Row label="Quantity" value={`× ${quantity}`} />
                      <Row
                        label="Subtotal"
                        value={`$${result.subtotal.toFixed(2)}`}
                      />
                      {result.discountAmount > 0 && (
                        <Row
                          label={`Discount (${discountPercent}%)`}
                          value={`−$${result.discountAmount.toFixed(2)}`}
                          accent
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`mt-5 group/cta flex w-full items-center justify-center gap-2 rounded-md bg-linear-to-r ${PLAN_VISUALS[servicePlan].accent} px-5 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-xl ${PLAN_VISUALS[servicePlan].glow} transition-all hover:scale-[1.02] hover:brightness-110`}
                    >
                      Add to Cart · ${result.total.toFixed(2)}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform group-hover/cta:translate-x-1"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>

                    {toast && (
                      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        {toast}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function BigInput({
  label,
  value,
  onChange,
  unitSuffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unitSuffix: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={0}
          step={0.1}
          className="w-full rounded-2xl border border-border-soft bg-background/60 px-4 py-4 pr-14 text-2xl font-black tabular-nums outline-none ring-[#d9f000]/40 transition focus:border-[#d9f000]/40 focus:ring-2"
          suppressHydrationWarning
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-md bg-white/5 px-2 py-1 text-xs font-bold uppercase tracking-wider text-foreground-muted">
          {unitSuffix}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-foreground-muted">{label}</span>
      <span
        className={`font-mono font-semibold ${
          accent ? "text-[#d9f000]" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SignPreview({
  w,
  l,
  unit,
}: {
  w: number;
  l: number;
  unit: MeasurementUnit;
}) {
  // Scale rectangle to fit a 240×140 container, preserving aspect ratio.
  const maxW = 240;
  const maxH = 140;
  const aspect = w / l;
  let previewW = maxW;
  let previewH = maxW / aspect;
  if (previewH > maxH) {
    previewH = maxH;
    previewW = maxH * aspect;
  }

  return (
    <div className="grid h-44 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-white/3 to-white/0 px-3">
      <div className="relative">
        <div
          className="relative overflow-hidden rounded-md border-2 border-dashed border-[#d9f000]/40 bg-linear-to-br from-[#d9f000]/15 via-[#18d3e8]/10 to-[#d94cb3]/15"
          style={{ width: previewW, height: previewH }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">
              Your sign
            </span>
          </div>
        </div>

        {/* Width label below */}
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-[#d9f000]">
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-[#d9f000]/40 to-transparent" />
          <span className="font-mono">
            {w}
            {unit}
          </span>
          <span className="h-px flex-1 bg-linear-to-l from-transparent via-[#d9f000]/40 to-transparent" />
        </div>

        {/* Height label on right */}
        <div
          className="absolute top-0 -right-9 flex flex-col items-center gap-1 text-[10px] font-bold text-[#d94cb3]"
          style={{ height: previewH }}
        >
          <span className="w-px flex-1 bg-linear-to-b from-transparent via-[#d94cb3]/40 to-transparent" />
          <span className="font-mono [writing-mode:vertical-rl]">
            {l}
            {unit}
          </span>
          <span className="w-px flex-1 bg-linear-to-t from-transparent via-[#d94cb3]/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
