/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MATERIAL_OPTIONS,
  QUANTITY_OPTIONS,
  SHAPE_OPTIONS,
  SIZE_OPTIONS,
  calcPrice,
  type MaterialKey,
  type QuantityKey,
  type ShapeKey,
  type SizeKey,
} from "@/lib/pricing";
import { useCart } from "@/lib/cart-store";
import { useRouter } from "next/navigation";
import type { VinylStickerCartItem } from "@/lib/cart-types";

type SizeChoice = SizeKey | "custom";

const ACCEPT =
  ".png,.jpg,.jpeg,.pdf,.svg,.ai,image/png,image/jpeg,image/svg+xml,application/pdf";

const SHAPE_ICON: Record<ShapeKey, string> = {
  custom: "/custom_shape-removebg-preview.png",
  circle: "/circle-removebg-preview.png",
  oval: "/oval-removebg-preview.png",
  square: "/square-removebg-preview.png",
  rectangle: "/rectangle-removebg-preview.png",
};

const MATERIAL_ICON: Record<MaterialKey, string> = {
  matte: "/matte-removebg-preview.png",
  gloss: "/glass-removebg-preview.png",
  holographic: "/holographic-removebg-preview.png",
  silver: "/silver-removebg-preview.png",
};

const SIZE_ICON: Record<SizeKey, string> = {
  "2x2": "/small-removebg-preview.png",
  "3x3": "/medium-removebg-preview.png",
  "4x4": "/large-removebg-preview.png",
  "5x5": "/StickerShuttle_cdIcon_gi5w46-removebg-preview.png",
};

const CUSTOM_SIZE_ICON = "/custom_size-removebg-preview.png";

const SIZE_HOVER_TEXT: Record<SizeKey, string> = {
  "2x2": "About the size of an Oreo",
  "3x3": "About the size of a Post-It",
  "4x4": "About the size of bread",
  "5x5": "About the size of a CD",
};

const POPULAR_SIZES: { label: string; w: number; h: number }[] = [
  { label: '5.5"', w: 5.5, h: 5.5 },
  { label: '11" × 3"', w: 11, h: 3 },
  { label: '3" × 2"', w: 3, h: 2 },
  { label: '4" × 3"', w: 4, h: 3 },
];

export default function ProductConfigurator() {
  const router = useRouter();
  const { addItem } = useCart();
  const [shape, setShape] = useState<ShapeKey>("custom");
  const [roundedCorners, setRoundedCorners] = useState<boolean>(true);
  const [material, setMaterial] = useState<MaterialKey>("matte");
  const [size, setSize] = useState<SizeChoice>("3x3");
  const [customWidth, setCustomWidth] = useState<number>(3);
  const [customHeight, setCustomHeight] = useState<number>(3);
  const [quantity, setQuantity] = useState<QuantityKey | "custom">(100);
  const [customQty, setCustomQty] = useState<number>(150);
  const [instructions, setInstructions] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const effectiveQty: QuantityKey = useMemo(() => {
    if (quantity === "custom") {
      const closest = QUANTITY_OPTIONS.reduce((a, b) =>
        Math.abs(b - customQty) < Math.abs(a - customQty) ? b : a,
      );
      return closest;
    }
    return quantity;
  }, [quantity, customQty]);

  const price = useMemo(
    () =>
      calcPrice({
        size,
        qty: effectiveQty,
        shape,
        material,
        customWidth,
        customHeight,
      }),
    [size, effectiveQty, shape, material, customWidth, customHeight],
  );

  const tierPrices = useMemo(
    () =>
      QUANTITY_OPTIONS.map((q) => {
        const p = calcPrice({
          size,
          qty: q,
          shape,
          material,
          customWidth,
          customHeight,
        });
        return { qty: q, ...p };
      }),
    [size, shape, material, customWidth, customHeight],
  );

  async function handleFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setFileUrl(null);
    setUploadError(null);
    setIsUploading(true);

    try {
      // Step 1: Ask our backend for a Shopify staged upload target.
      const stageResp = await fetch("/api/shopify-upload/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: f.name,
          mimeType: f.type || "application/octet-stream",
          fileSize: f.size,
        }),
      });
      const stage = (await stageResp.json()) as
        | {
            url: string;
            resourceUrl: string;
            parameters: Array<{ name: string; value: string }>;
          }
        | { error: string };

      if (!stageResp.ok || "error" in stage) {
        const message =
          "error" in stage ? stage.error : "Could not get upload target";
        throw new Error(message);
      }

      // Step 2: Upload the file directly to Shopify's GCS-backed staging URL.
      // Order matters: signed params first, then `file` last.
      const fd = new FormData();
      for (const param of stage.parameters) {
        fd.append(param.name, param.value);
      }
      fd.append("file", f);

      const uploadResp = await fetch(stage.url, { method: "POST", body: fd });
      if (!uploadResp.ok) {
        const text = await uploadResp.text();
        throw new Error(
          `Upload to staging failed (${uploadResp.status}): ${text.slice(0, 200)}`,
        );
      }

      // Step 3: Register the staged file with Shopify Files; backend polls
      // until the permanent CDN URL is ready and returns it.
      const registerResp = await fetch("/api/shopify-upload/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceUrl: stage.resourceUrl,
          filename: f.name,
          mimeType: f.type || "application/octet-stream",
        }),
      });
      const registered = (await registerResp.json()) as
        | { fileId: string; url: string }
        | { error: string };

      if (!registerResp.ok || "error" in registered) {
        const message =
          "error" in registered ? registered.error : "Failed to register file";
        throw new Error(message);
      }

      setFileUrl(registered.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }

  function handleAddToCart() {
    if (!file || isCheckingOut || isUploading) return;
    setIsCheckingOut(true);
    setToast(null);

    const tierQty: QuantityKey = effectiveQty;
    const sizeLabel =
      size === "custom"
        ? `${customWidth}″ × ${customHeight}″`
        : SIZE_OPTIONS.find((s) => s.key === size)?.label ?? size;
    const shapeLabel =
      SHAPE_OPTIONS.find((s) => s.key === shape)?.label ?? shape;
    const materialLabel =
      MATERIAL_OPTIONS.find((m) => m.key === material)?.label ?? material;

    const cartItem: Omit<VinylStickerCartItem, "id" | "addedAt"> = {
      kind: "vinyl-sticker",
      title: "Custom Vinyl Stickers",
      subtitle: `${sizeLabel} · ${shapeLabel} · ${materialLabel}`,
      thumbnail: "🌟",
      unitLabel: `$${price.perUnit.toFixed(2)} / sticker`,
      totalPrice: price.total,
      quantity: tierQty,
      shape,
      material,
      size,
      customWidth: size === "custom" ? customWidth : undefined,
      customHeight: size === "custom" ? customHeight : undefined,
      roundedCorners:
        shape === "square" || shape === "rectangle" ? roundedCorners : null,
      tierQty,
      perUnit: price.perUnit,
      fileUrl: fileUrl ?? undefined,
      fileName: file.name,
      instructions: instructions || undefined,
      editHref: "/products/vinyl-stickers",
    };

    addItem(cartItem);
    router.push("/cart");
  }

  function applyPopularSize(w: number, h: number) {
    setSize("custom");
    setCustomWidth(w);
    setCustomHeight(h);
  }

  return (
    <section className="relative">
      {/* Top bar: Sticker Types breadcrumb */}
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
            Sticker Types
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HERO BANNER */}
        <HeroBanner />

        {/* CONFIGURATOR — 4 columns */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_220px_minmax(0,1fr)_320px]">
          {/* Column 1: Shape */}
          <Panel title="Select a Shape" icon="✨">
            <ShapeButton
              shape="custom"
              active={shape === "custom"}
              onClick={() => setShape("custom")}
              full
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SHAPE_OPTIONS.filter((s) => s.key !== "custom").map((s) => (
                <ShapeButton
                  key={s.key}
                  shape={s.key as ShapeKey}
                  active={shape === s.key}
                  onClick={() => setShape(s.key as ShapeKey)}
                />
              ))}
            </div>

            {/* Rounded Corners toggle (Square / Rectangle only) */}
            {(shape === "square" || shape === "rectangle") && (
              <div className="mt-4 border-t border-border-soft pt-4">
                <div className="mb-2 text-sm font-semibold">
                  Rounded Corners?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoundedCorners(true)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      roundedCorners
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoundedCorners(false)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      !roundedCorners
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            )}
          </Panel>

          {/* Column 2: Material */}
          <Panel title="Material" icon="📋">
            <div className="grid grid-cols-2 gap-3">
              {MATERIAL_OPTIONS.map((m) => (
                <MaterialButton
                  key={m.key}
                  material={m.key as MaterialKey}
                  label={m.label}
                  active={material === m.key}
                  onClick={() => setMaterial(m.key as MaterialKey)}
                />
              ))}
            </div>
          </Panel>

          {/* Column 3: Size */}
          <Panel title="Select a size" icon="📐">
            <div className="grid grid-cols-2 gap-3">
              {SIZE_OPTIONS.map((s) => (
                <SizeButton
                  key={s.key}
                  size={s.key}
                  label={s.label}
                  active={size === s.key}
                  onClick={() => setSize(s.key)}
                />
              ))}
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setSize("custom")}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                  size === "custom"
                    ? "border-highlight bg-highlight-soft"
                    : "border-dashed border-border-strong bg-white/2 hover:bg-white/5"
                }`}
              >
                <Image
                  src={CUSTOM_SIZE_ICON}
                  alt=""
                  width={28}
                  height={28}
                  className="shrink-0"
                />
                <span className="font-medium">Custom size</span>
              </button>
              {size === "custom" && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="W (in)"
                      value={customWidth}
                      onChange={setCustomWidth}
                    />
                    <NumberField
                      label="H (in)"
                      value={customHeight}
                      onChange={setCustomHeight}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                      Other Popular Sizes:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {POPULAR_SIZES.map((p) => {
                        const active =
                          size === "custom" &&
                          customWidth === p.w &&
                          customHeight === p.h;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => applyPopularSize(p.w, p.h)}
                            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                              active
                                ? "border-highlight bg-highlight-soft"
                                : "border-border-soft bg-white/3 hover:bg-white/6"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Column 4: Quantity */}
          <Panel title="Select a quantity" icon="#">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setQuantity("custom")}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                  quantity === "custom"
                    ? "border-highlight bg-highlight-soft"
                    : "border-border-soft bg-white/3 hover:bg-white/6"
                }`}
              >
                <span className="font-medium">Custom</span>
                {quantity === "custom" && (
                  <input
                    type="number"
                    min={1}
                    value={customQty}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCustomQty(Number.isFinite(v) && v > 0 ? v : 1);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 rounded-md border border-border-soft bg-white/5 px-2 py-1 text-right text-xs outline-none"
                  />
                )}
              </button>

              {tierPrices.map(({ qty, total, savingsPercent }) => {
                const active = quantity === qty;
                return (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                      active
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <span className="font-medium">{qty.toLocaleString()}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">${total.toFixed(2)}</span>
                      {savingsPercent > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Save {savingsPercent}%
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Total card */}
            <div className="mt-4 overflow-hidden rounded-xl total-gradient p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-white/90">Total:</span>
                <span className="text-2xl font-bold text-white">
                  ${price.total.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 text-right text-xs font-medium text-white/80">
                ${price.perUnit.toFixed(2)}/ea.
              </div>
            </div>

            {/* Shipping info */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border-soft bg-white/3 px-3 py-2 text-[12px] text-foreground-muted">
              <span>🕒</span>
              <span>Printed and shipped next business day</span>
            </div>
          </Panel>
        </div>

        {/* Instructions + Upload */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-border-strong bg-surface/60 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span>✏️</span> Additional Instructions
              <span className="text-xs font-normal text-foreground-muted">
                (optional)
              </span>
            </div>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Enter any special requests or notes here..."
              className="w-full resize-none rounded-xl bg-transparent text-sm text-foreground placeholder:text-foreground-muted/60 outline-none"
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragActive
                ? "border-highlight bg-highlight-soft"
                : "border-border-strong bg-surface/60 hover:bg-white/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ACCEPT}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex w-full items-center gap-5">
                <div className="relative h-40 w-40 shrink-0">
                  {filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreview}
                      alt="Upload preview"
                      className="h-40 w-40 rounded-xl object-contain bg-white/5 ring-1 ring-border-strong"
                    />
                  ) : (
                    <div className="grid h-40 w-40 place-items-center rounded-xl bg-white/5 text-5xl">
                      📄
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 backdrop-blur-sm">
                      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
                <div className="flex-1 truncate text-left">
                  <div className="truncate font-medium text-foreground">
                    {file.name}
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  {isUploading && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                      Uploading to Shopify…
                    </div>
                  )}
                  {!isUploading && fileUrl && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      ✓ Uploaded to Shopify Files
                    </div>
                  )}
                  {!isUploading && !fileUrl && uploadError && (
                    <div className="mt-2 max-w-md truncate rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                      ⚠ Upload failed: {uploadError}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFileUrl(null);
                    setUploadError(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-full border border-border-soft bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="grid h-12 w-12 place-items-center rounded-full bg-highlight text-2xl">
                  ⬆
                </div>
                <div className="mt-3 text-base font-semibold">
                  Drag or click to upload your file
                </div>
                <div className="mt-1 text-xs text-foreground-muted">
                  All formats supported · Max file size: 25MB · 1 file per order
                </div>
              </>
            )}
          </div>
        </div>

        {/* CTA bar */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!file || isCheckingOut || isUploading}
            className={`group relative flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition ${
              file && !isCheckingOut && !isUploading
                ? "bg-highlight text-yellow-950 shadow-lg shadow-highlight/20 hover:brightness-105"
                : "cursor-not-allowed border border-border-soft bg-white/4 text-foreground-muted"
            }`}
          >
            {isCheckingOut ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating order…
              </>
            ) : isUploading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Uploading file…
              </>
            ) : file ? (
              <>
                <span>🛒</span>
                Add to Cart · ${price.total.toFixed(2)}
              </>
            ) : (
              <>
                <span>⬆</span>
                Upload Artwork to Continue
              </>
            )}
          </button>
          <p className="mt-2 text-center text-xs text-foreground-muted">
            You&apos;ll be redirected to Shopify checkout to complete payment.
          </p>
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

/* ----------------- subcomponents ----------------- */

function HeroBanner() {
  return (
    <div className="relative min-h-44 overflow-hidden rounded-2xl">
      <Image
        src="/StickerShuttle_Banner_CustomStickers_scxnng.png"
        alt=""
        fill
        sizes="(min-width: 1024px) 75vw, 100vw"
        className="object-cover"
        priority
      />
      <div className="relative flex min-h-44 items-center gap-4 px-6 py-6 sm:px-8">
        <div className="hidden shrink-0 sm:block">
          <Image
            src="/custom_shape-removebg-preview.png"
            alt=""
            width={140}
            height={140}
            className="drop-shadow-xl"
            priority
          />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-white sm:text-3xl">
            Vinyl Stickers
          </div>
          <div className="mt-1 text-sm font-semibold text-white/95">
            Perfect for any application. The perfect sticker.
          </div>
          <p className="mt-2 max-w-lg text-xs leading-relaxed text-white/95 sm:text-sm">
            Premium vinyl stickers built for laptops, water bottles, and the
            outdoors — waterproof, scratch-resistant, and dishwasher safe.
          </p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span className="text-highlight">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function ShapeButton({
  shape,
  active,
  onClick,
  full = false,
}: {
  shape: ShapeKey;
  active: boolean;
  onClick: () => void;
  full?: boolean;
}) {
  const opt = SHAPE_OPTIONS.find((s) => s.key === shape);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center rounded-xl border px-3 transition ${
        full ? "py-5" : "py-4"
      } ${
        active
          ? "border-highlight bg-highlight-soft"
          : "border-border-soft bg-white/3 hover:bg-white/6"
      }`}
    >
      {active && (
        <span className="absolute left-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-highlight text-[9px] font-bold text-yellow-950">
          ★
        </span>
      )}
      <Image
        src={SHAPE_ICON[shape]}
        alt={opt?.label ?? shape}
        width={full ? 64 : 56}
        height={full ? 64 : 56}
        className={`${full ? "h-16 w-16" : "h-14 w-14"} object-contain transition-transform duration-500 ease-out group-hover:rotate-180`}
      />
      <span className="mt-2 text-xs font-medium">{opt?.label}</span>
    </button>
  );
}

function MaterialButton({
  material,
  label,
  active,
  onClick,
}: {
  material: MaterialKey;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center rounded-xl border px-3 py-4 transition ${
        active
          ? "border-highlight bg-highlight-soft"
          : "border-border-soft bg-white/3 hover:bg-white/6"
      }`}
    >
      {active && (
        <span className="absolute left-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-highlight text-[9px] font-bold text-yellow-950">
          ★
        </span>
      )}
      <Image
        src={MATERIAL_ICON[material]}
        alt={label}
        width={56}
        height={56}
        className="h-14 w-14 object-contain transition-transform duration-500 ease-out group-hover:rotate-180"
      />
      <span className="mt-2 text-xs font-medium">{label}</span>
    </button>
  );
}

function SizeButton({
  size,
  label,
  active,
  onClick,
}: {
  size: SizeKey;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center rounded-xl border px-3 py-4 transition ${
        active
          ? "border-highlight bg-highlight-soft"
          : "border-border-soft bg-white/3 hover:bg-white/6"
      }`}
    >
      {active && (
        <span className="absolute left-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-highlight text-[9px] font-bold text-yellow-950">
          ★
        </span>
      )}
      <div className="relative grid h-14 w-14 place-items-center overflow-hidden">
        <Image
          src={SIZE_ICON[size]}
          alt={label}
          width={56}
          height={56}
          className="h-14 w-14 object-contain transition-opacity duration-200 group-hover:opacity-0"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {SIZE_HOVER_TEXT[size]}
        </span>
      </div>
      <span className="mt-2 text-center text-xs font-medium">{label}</span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
        {label}
      </span>
      <input
        type="number"
        min={0.5}
        step={0.25}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) && v > 0 ? v : 0);
        }}
        className="w-full rounded-lg border border-border-soft bg-white/4 px-3 py-1.5 text-sm text-foreground outline-none ring-highlight/40 focus:ring-2"
      />
    </label>
  );
}
