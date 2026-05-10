/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ADD_ONS,
  COMMON_SIZES,
  SIGNAGE_MATERIALS,
  SIGNAGE_TYPES,
  calcSignagePrice,
  requiresManualQuote,
} from "@/lib/signage-pricing";
import { Section } from "@/components/configurator/Section";
import { QuantityStepper } from "@/components/configurator/QuantityStepper";
import {
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";

type SizeMode = "preset" | "custom";

export default function SignageCalculator() {
  const [type, setType] = useState<string>(SIGNAGE_TYPES[0].key);
  const materials = SIGNAGE_MATERIALS[type] ?? [];
  const [material, setMaterial] = useState<string>(materials[0]?.key);

  const [sizeMode, setSizeMode] = useState<SizeMode>("preset");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [customW, setCustomW] = useState<number>(36);
  const [customH, setCustomH] = useState<number>(72);

  const [sides, setSides] = useState<"single" | "double">("single");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  const [upload, setUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);

  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submittedKind, setSubmittedKind] = useState<"order" | "quote" | null>(
    null,
  );

  // Reset material when type changes (so we don't keep an invalid material).
  useEffect(() => {
    const nextMats = SIGNAGE_MATERIALS[type] ?? [];
    if (!nextMats.find((m) => m.key === material)) {
      setMaterial(nextMats[0]?.key);
    }
    // Reset sides if new material doesn't allow double.
    const next = nextMats.find((m) => m.key === material) ?? nextMats[0];
    if (next && !next.doubleSidedAllowed && sides === "double") {
      setSides("single");
    }
    // Reset out-of-range add-ons
    setAddOns((prev) =>
      prev.filter((k) => {
        const a = ADD_ONS.find((x) => x.key === k);
        return a?.applicableTo.includes(type);
      }),
    );
    setPresetIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const presets = COMMON_SIZES[type] ?? [];
  const currentMaterial = materials.find((m) => m.key === material);
  const applicableAddOns = ADD_ONS.filter((a) => a.applicableTo.includes(type));

  // Resolve dimensions in inches.
  const dims =
    sizeMode === "preset"
      ? presets[presetIdx] ?? { w: 36, h: 72, label: "" }
      : { w: customW, h: customH, label: `${customW}″ × ${customH}″` };

  const isManualQuote =
    sizeMode === "custom" && requiresManualQuote(dims.w, dims.h);

  const price = useMemo(
    () =>
      calcSignagePrice({
        type,
        material,
        width: dims.w,
        height: dims.h,
        sides,
        addOns,
        quantity,
      }),
    [type, material, dims.w, dims.h, sides, addOns, quantity],
  );

  function toggleAddOn(key: string) {
    setAddOns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleSubmit(kind: "order" | "quote") {
    if (kind === "quote" && !email.trim()) {
      setToast("Please enter your email so we can send you a quote.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setToast(null);

    try {
      const response = await fetch("/api/checkout-signage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          type,
          material,
          width: dims.w,
          height: dims.h,
          sides,
          addOns,
          quantity,
          fileUrl: upload.fileUrl ?? undefined,
          fileName: upload.file?.name,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const data = (await response.json()) as {
        invoiceUrl?: string;
        quoteAccepted?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Submission failed");
      }
      if (kind === "order" && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }
      // Quote path — show confirmation
      setSubmittedKind("quote");
    } catch (err) {
      setToast(`Error: ${err instanceof Error ? err.message : "Submission failed"}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedKind === "quote") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
          <div className="text-5xl">✓</div>
          <h1 className="mt-4 text-2xl font-bold">Quote request received</h1>
          <p className="mt-3 text-sm text-foreground-muted">
            Our team will review your custom signage request and reply at{" "}
            <span className="font-mono text-foreground">{email}</span> within
            24 business hours.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full border border-border-strong bg-white/5 px-5 py-2 text-sm font-medium hover:bg-white/10"
          >
            ← Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative">
      {/* Breadcrumb */}
      <div className="border-b border-border-soft bg-background-soft/60">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs sm:px-6 lg:px-8">
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
            All Products
          </Link>
          <span className="text-foreground-muted/40">/</span>
          <span className="font-medium">Custom Signage Quote</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Instant calculator + custom quotes
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Custom Signage Calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
            Banners, yard signs, aluminum, acrylic, foam board — pick standard
            sizes for instant pricing or request a quote for custom dimensions.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          {/* LEFT: Configurator */}
          <div className="space-y-6">
            {/* Type */}
            <Section title="Sign type">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {SIGNAGE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition ${
                      type === t.key
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <span className="text-3xl">{t.icon}</span>
                    <span className="mt-1 text-xs font-semibold">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
              {currentMaterial && (
                <p className="mt-2 text-[11px] text-foreground-muted">
                  {SIGNAGE_TYPES.find((t) => t.key === type)?.blurb}
                </p>
              )}
            </Section>

            {/* Material */}
            <Section title="Material" value={currentMaterial?.label}>
              <div className="grid gap-2 sm:grid-cols-2">
                {materials.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMaterial(m.key)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      material === m.key
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className="text-xs font-semibold text-foreground-muted">
                      ${m.pricePerSqFt.toFixed(2)}/sqft
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Size — preset OR custom */}
            <Section
              title="Size"
              value={
                sizeMode === "preset"
                  ? presets[presetIdx]?.label
                  : `${customW}″ × ${customH}″`
              }
            >
              <div className="mb-3 inline-flex rounded-full border border-border-soft bg-white/3 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSizeMode("preset")}
                  className={`rounded-full px-4 py-1.5 transition ${
                    sizeMode === "preset"
                      ? "bg-highlight text-yellow-950"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  Standard sizes
                </button>
                <button
                  type="button"
                  onClick={() => setSizeMode("custom")}
                  className={`rounded-full px-4 py-1.5 transition ${
                    sizeMode === "custom"
                      ? "bg-highlight text-yellow-950"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  Custom size
                </button>
              </div>
              {sizeMode === "preset" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {presets.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setPresetIdx(i)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        presetIdx === i
                          ? "border-highlight bg-highlight-soft"
                          : "border-border-soft bg-white/3 hover:bg-white/6"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <DimField label="Width (in)" value={customW} onChange={setCustomW} />
                  <DimField label="Height (in)" value={customH} onChange={setCustomH} />
                </div>
              )}
              <p className="mt-2 text-[11px] text-foreground-muted">
                Area: <span className="font-mono text-foreground">{price.area} sq ft</span>
                {isManualQuote && (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Oversize — quote required
                  </span>
                )}
              </p>
            </Section>

            {/* Sides */}
            <Section title="Print sides" value={sides === "single" ? "Single-sided" : "Double-sided"}>
              <div className="grid grid-cols-2 gap-2">
                {(["single", "double"] as const).map((s) => {
                  const disabled =
                    s === "double" && !currentMaterial?.doubleSidedAllowed;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSides(s)}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        sides === s
                          ? "border-highlight bg-highlight-soft"
                          : "border-border-soft bg-white/3 hover:bg-white/6"
                      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      {s === "single" ? "Single-sided" : "Double-sided"}
                      {disabled && (
                        <span className="ml-1 text-[10px] text-foreground-muted">
                          (n/a)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Add-ons */}
            {applicableAddOns.length > 0 && (
              <Section title="Add-ons">
                <div className="grid gap-2 sm:grid-cols-2">
                  {applicableAddOns.map((a) => {
                    const checked = addOns.includes(a.key);
                    const feeText = a.flatFee
                      ? `+$${a.flatFee.toFixed(2)}`
                      : a.percentMarkup
                        ? `+${(a.percentMarkup * 100).toFixed(0)}%`
                        : "";
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => toggleAddOn(a.key)}
                        className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          checked
                            ? "border-highlight bg-highlight-soft"
                            : "border-border-soft bg-white/3 hover:bg-white/6"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                              checked
                                ? "border-highlight bg-highlight text-yellow-950"
                                : "border-border-strong bg-transparent"
                            }`}
                          >
                            {checked && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{a.label}</div>
                            <div className="text-[11px] text-foreground-muted">
                              {a.description}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-emerald-300">
                          {feeText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Quantity */}
            <Section title="Quantity">
              <QuantityStepper value={quantity} min={1} onChange={setQuantity} />
            </Section>

            {/* Design upload (optional now) */}
            <Section title="Upload your design (optional now — required before printing)">
              <UploadBox
                slot={upload}
                onSelect={(f) => uploadDesign(f, setUpload)}
                onClear={() => setUpload(EMPTY_UPLOAD_SLOT)}
              />
            </Section>

            {/* Customer info — required for quote, optional for instant order */}
            <Section
              title={
                isManualQuote
                  ? "Your contact info (required for quote)"
                  : "Your contact info (optional)"
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                  suppressHydrationWarning
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything else we should know? (install location, deadline, special finishing, etc.)"
                className="mt-3 w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                suppressHydrationWarning
              />
            </Section>
          </div>

          {/* RIGHT: Sticky preview + total + CTAs */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="space-y-4 rounded-2xl border border-border-soft bg-surface p-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Your sign
                </div>
                <div className="mt-1 text-base font-bold">
                  {SIGNAGE_TYPES.find((t) => t.key === type)?.label}
                </div>
                <div className="text-xs text-foreground-muted">
                  {currentMaterial?.label}
                </div>
              </div>

              <SignPreview
                w={dims.w}
                h={dims.h}
                sides={sides}
                fileUrl={upload.fileUrl}
              />

              <div className="rounded-xl bg-white/5 px-3 py-2 text-xs">
                <div className="flex items-center justify-between text-foreground-muted">
                  <span>Dimensions</span>
                  <span className="font-mono text-foreground">
                    {dims.w}″ × {dims.h}″
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-foreground-muted">
                  <span>Area</span>
                  <span className="font-mono text-foreground">
                    {price.area} sq ft
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-foreground-muted">
                  <span>Sides</span>
                  <span className="text-foreground">
                    {sides === "single" ? "Single-sided" : "Double-sided"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-foreground-muted">
                  <span>Quantity</span>
                  <span className="font-mono text-foreground">{quantity}</span>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl border border-border-soft px-3 py-3 text-xs">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Price breakdown (per unit)
                </div>
                {price.breakdown.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between gap-3 py-0.5 text-foreground-muted"
                  >
                    <span className="truncate">{b.label}</span>
                    <span className="shrink-0 font-mono text-foreground">
                      {b.amount >= 0 ? "+" : ""}${Math.abs(b.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="overflow-hidden rounded-2xl total-gradient p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-white/85">
                    {quantity > 1
                      ? `${quantity} × $${price.perUnit.toFixed(2)}`
                      : "Estimated total"}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    ${price.total.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 text-right text-[10px] font-medium text-white/80">
                  {isManualQuote
                    ? "Estimate only — final quote sent by email"
                    : "Free online proof · 24–48h production"}
                </div>
              </div>

              {/* CTA */}
              {isManualQuote ? (
                <button
                  type="button"
                  onClick={() => handleSubmit("quote")}
                  disabled={submitting || !email.trim()}
                  className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    email.trim() && !submitting
                      ? "bg-highlight text-yellow-950 shadow-lg shadow-highlight/20 hover:brightness-105"
                      : "cursor-not-allowed border border-border-soft bg-white/4 text-foreground-muted"
                  }`}
                >
                  {submitting ? "Sending…" : "Request Quote →"}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit("order")}
                    disabled={submitting}
                    className="w-full rounded-2xl bg-highlight px-5 py-3 text-sm font-semibold text-yellow-950 shadow-lg shadow-highlight/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                  >
                    {submitting ? "Creating order…" : `Add to Cart · $${price.total.toFixed(2)}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit("quote")}
                    disabled={submitting || !email.trim()}
                    className={`w-full rounded-2xl border px-5 py-3 text-xs font-semibold transition ${
                      email.trim() && !submitting
                        ? "border-border-strong bg-white/5 text-foreground hover:bg-white/10"
                        : "cursor-not-allowed border-border-soft bg-white/3 text-foreground-muted"
                    }`}
                  >
                    Or request a custom quote instead
                  </button>
                </div>
              )}

              <p className="text-center text-[10px] text-foreground-muted">
                By placing this order you agree to our{" "}
                <Link href="#" className="underline">
                  terms
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border-strong bg-surface-elevated px-5 py-3 text-sm shadow-2xl shadow-black/40">
          {toast}
        </div>
      )}
    </section>
  );
}

/* --- subcomponents --- */

function DimField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </span>
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n > 0 ? Math.round(n) : 1);
        }}
        className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground outline-none ring-highlight/40 focus:ring-2"
        suppressHydrationWarning
      />
    </label>
  );
}

function SignPreview({
  w,
  h,
  sides,
  fileUrl,
}: {
  w: number;
  h: number;
  sides: "single" | "double";
  fileUrl: string | null;
}) {
  // Scale rectangle to fit a 280×180 preview area, preserving aspect ratio.
  const maxW = 280;
  const maxH = 180;
  const scale = Math.min(maxW / w, maxH / h, 1);
  const previewW = Math.max(40, w * scale);
  const previewH = Math.max(30, h * scale);

  return (
    <div className="grid h-48 place-items-center rounded-xl bg-white/5">
      <div
        className="relative grid place-items-center rounded border-2 border-dashed border-border-strong bg-gradient-to-br from-blue-500/10 to-purple-500/10"
        style={{ width: previewW, height: previewH }}
      >
        {fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl}
            alt="Design"
            className="absolute inset-1 rounded object-contain"
          />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            {w}″ × {h}″
          </span>
        )}
        {sides === "double" && (
          <span className="absolute -top-2 -right-2 rounded-full bg-blue-500/90 px-2 py-0.5 text-[9px] font-bold text-white">
            2-sided
          </span>
        )}
      </div>
    </div>
  );
}
