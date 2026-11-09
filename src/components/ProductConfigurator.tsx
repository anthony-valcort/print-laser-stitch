/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { shrinkToUploadLimit, shrinkBlobToUploadLimit } from "@/lib/shrink-image";
import MobileBuyBar from "@/components/MobileBuyBar";
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
import ProofModal, {
  type ProofApprovalData,
} from "@/components/proof/ProofModal";
import type { ProofShape, RoundedCorners } from "@/lib/proof/types";

type SizeChoice = SizeKey | "custom";

// Sticker order page: shape / material / size / quantity / upload / proof.
const HOW_TO_ORDER_VIDEO_ID = "Op0VOMmloQ4";

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

/** Minimum quantity the customer can order when picking "Custom" — tiers
 * start at 50, but Anthony lets people order down to 25 with custom qty. */
const MIN_CUSTOM_QTY = 25;

const SIZE_HOVER_TEXT: Record<SizeKey, string> = {
  "2x2": "About the size of a lime",
  "3x3": "About the size of a baseball",
  "4x4": "About the size of a coffee coaster",
  "5x5": "About the size of a dollar bill",
};


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
  const [showProof, setShowProof] = useState(false);
  const approveRef = useRef<(() => Promise<ProofApprovalData | null>) | null>(null);

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

  // The *actual* number of stickers the customer is ordering. In tier mode
  // that's the chosen tier; in custom mode it's whatever number they typed,
  // clamped to the minimum. `effectiveQty` above stays as the snapped tier —
  // it's only used as the pricing reference (per-unit at nearest tier rate).
  const orderQty = useMemo(() => {
    if (quantity === "custom") return Math.max(MIN_CUSTOM_QTY, customQty);
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

  async function handleFile(original: File | undefined | null) {
    if (!original) return;
    // Large images are compressed to fit the storage limit instead of failing.
    const f = await shrinkToUploadLimit(original);
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

      // Step 2: Upload the file directly to the signed Cloudinary target.
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

      // Step 3: Look up the uploaded file on Cloudinary and get its permanent
      // delivery URL.
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

  function sizeInches(): { w: number; h: number } {
    if (size === "custom") return { w: customWidth, h: customHeight };
    const n =
      ({ "2x2": 2, "3x3": 3, "4x4": 4, "5x5": 5 } as Record<string, number>)[
        size
      ] ?? 3;
    return { w: n, h: n };
  }

  /** Generic Shopify staged upload — used for the proof PNG + cutline SVG. */
  async function uploadBlobToShopify(
    rawBlob: Blob,
    rawFilename: string,
    rawMimeType: string,
  ): Promise<string | undefined> {
    try {
      const { blob, filename, mimeType } = rawMimeType.startsWith("image/")
        ? await shrinkBlobToUploadLimit(rawBlob, rawFilename)
        : { blob: rawBlob, filename: rawFilename, mimeType: rawMimeType };
      const stageResp = await fetch("/api/shopify-upload/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, mimeType, fileSize: blob.size }),
      });
      const stage = (await stageResp.json()) as
        | {
            url: string;
            resourceUrl: string;
            parameters: Array<{ name: string; value: string }>;
          }
        | { error: string };
      if (!stageResp.ok || "error" in stage) return undefined;

      const fd = new FormData();
      for (const param of stage.parameters) fd.append(param.name, param.value);
      fd.append("file", blob, filename);
      const up = await fetch(stage.url, { method: "POST", body: fd });
      if (!up.ok) return undefined;

      const regResp = await fetch("/api/shopify-upload/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceUrl: stage.resourceUrl,
          filename,
          mimeType,
        }),
      });
      const reg = (await regResp.json()) as
        | { fileId: string; url: string }
        | { error: string };
      if (!regResp.ok || "error" in reg) return undefined;
      return reg.url;
    } catch {
      return undefined;
    }
  }

  function buildBaseCartItem(): Omit<
    VinylStickerCartItem,
    "id" | "addedAt"
  > {
    const tierQty: QuantityKey = effectiveQty;
    const sizeLabel =
      size === "custom"
        ? `${customWidth}″ × ${customHeight}″`
        : SIZE_OPTIONS.find((s) => s.key === size)?.label ?? size;
    const shapeLabel =
      SHAPE_OPTIONS.find((s) => s.key === shape)?.label ?? shape;
    const materialLabel =
      MATERIAL_OPTIONS.find((m) => m.key === material)?.label ?? material;

    return {
      kind: "vinyl-sticker",
      title: "Custom Vinyl Stickers",
      subtitle: `${sizeLabel} · ${shapeLabel} · ${materialLabel}`,
      thumbnail: "/logo.avif",
      unitLabel: `$${price.perUnit.toFixed(2)} / sticker`,
      totalPrice: Math.round(price.perUnit * orderQty * 100) / 100,
      quantity: orderQty,
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
      fileName: file?.name,
      instructions: instructions || undefined,
      editHref: "/products/vinyl-stickers",
    };
  }

  /** Non-image files (PDF/AI/SVG) skip the proof step — straight to cart. */
  function addToCartNoProof() {
    if (!file || isCheckingOut || isUploading) return;
    setIsCheckingOut(true);
    setToast(null);
    addItem(buildBaseCartItem());
    router.push("/cart");
  }

  async function finalizeWithProof(
    data: ProofApprovalData,
    changeNote?: string,
  ) {
    setShowProof(false);
    setIsCheckingOut(true);
    setToast(null);

    const stamp = Date.now();
    const [proofUrl, cutlineUrl] = await Promise.all([
      uploadBlobToShopify(
        data.proofPng,
        `proof-${stamp}.png`,
        "image/png",
      ),
      uploadBlobToShopify(
        new Blob([data.cutlineSvg], { type: "image/svg+xml" }),
        `cutline-${stamp}.svg`,
        "image/svg+xml",
      ),
    ]);

    const cartItem = buildBaseCartItem();
    cartItem.proof = {
      status: changeNote ? "changes-requested" : "approved",
      proofUrl,
      cutlineUrl,
      shape: data.shape,
      borderThickness: data.borderThickness,
      roundedCorners: data.roundedCorners,
      removedBackground: data.removedBackground,
      lowResolution: data.lowResolution,
      changeNote: changeNote || undefined,
    };

    addItem(cartItem);
    router.push("/cart");
  }

  /** CTA: image files open the preflight proof; others go straight to cart. */
  function handleCheckoutClick() {
    if (!file || isCheckingOut || isUploading) return;
    if (file.type.startsWith("image/")) {
      const fn = approveRef.current;
      if (!fn) return;
      setIsCheckingOut(true);
      fn()
        .then((d) => {
          if (d) return finalizeWithProof(d);
          setIsCheckingOut(false);
        })
        .catch(() => {
          setIsCheckingOut(false);
          setToast("Could not prepare your proof. Try again.");
        });
    } else {
      addToCartNoProof();
    }
  }


  const ctaDisabled = !file || isCheckingOut || isUploading;

  return (
    <section className="relative">
      {/* Breadcrumb */}
      <div className="border-b border-border-soft bg-background-soft/60">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-xs sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-1 text-foreground-muted transition hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Home
          </Link>
          <span className="text-foreground-muted/40">/</span>
          <span className="font-medium">Custom Stickers</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h1 className="font-display text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl">
          Custom <span className="accent-gradient-text">Vinyl Stickers</span>
        </h1>

        {/* CONFIGURATOR — shape/material/size · quantity + proof · upload + buy */}
        <div id="order-options" className="mt-3 flex scroll-mt-24 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
          {/* COL 1 */}
          <div className="contents lg:block lg:space-y-5">
            <div className="order-1 lg:order-none">
            {/* Shape */}
            <Section step={1} title="Shape">
              <button
                type="button"
                onClick={() => setShape("custom")}
                className={`mb-3 flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${
                  shape === "custom" ? TILE_ON : `${TILE_OFF} opacity-45 saturate-50 hover:opacity-90 hover:saturate-100`
                }`}
              >
                <DieCutArt />
                <div className="min-w-0">
                  <div className="font-headline text-sm font-bold uppercase tracking-wide">
                    Die-cut
                  </div>
                  <div className="text-xs text-foreground-muted">
                    Cut right around your design
                  </div>
                </div>
                {shape === "custom" && <CheckBadge />}
              </button>

              <div className="grid grid-cols-2 gap-3">
                {(["circle", "oval", "square", "rectangle"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setShape(k)}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border px-2 pb-3 pt-3 transition ${
                      shape === k
                        ? TILE_ON
                        : `${TILE_OFF} opacity-45 saturate-50 hover:opacity-90 hover:saturate-100`
                    }`}
                  >
                    <ShapeArt kind={k} />
                    <span className="font-headline text-xs font-bold uppercase tracking-wide">
                      {k}
                    </span>
                    {shape === k && (
                      <span className="absolute right-2 top-2">
                        <CheckBadge />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {(shape === "square" || shape === "rectangle") && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <div className="mb-2 font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Rounded corners?
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRoundedCorners(true)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        roundedCorners ? TILE_ON : TILE_OFF
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundedCorners(false)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        !roundedCorners ? TILE_ON : TILE_OFF
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </Section>

            </div>
            <div className="order-2 lg:order-none">
            {/* Material */}
            <Section step={2} title="Material">
              <div className="grid grid-cols-4 gap-2">
                {MATERIAL_OPTIONS.map((m) => (
                  <OptionTile
                    key={m.key}
                    icon={MATERIAL_ICON[m.key as MaterialKey]}
                    label={m.label}
                    active={material === m.key}
                    onClick={() => setMaterial(m.key as MaterialKey)}
                  />
                ))}
              </div>
            </Section>

            </div>
          </div>

          {/* COL 2 */}
          <div className="contents lg:block lg:space-y-5">
            <div className="order-3 lg:order-none">
            {/* Size */}
            <Section step={3} title="Size">
              <div className="grid grid-cols-4 gap-2">
                {SIZE_OPTIONS.map((s) => (
                  <SizeTile
                    key={s.key}
                    size={s.key}
                    label={s.label}
                    active={size === s.key}
                    onClick={() => setSize(s.key)}
                  />
                ))}
              </div>
              <div
                className={`mt-4 rounded-2xl border-2 p-4 transition ${
                  size === "custom"
                    ? "border-[#d9f000] bg-[#d9f000]/10"
                    : "border-dashed border-border-strong bg-white/3"
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={CUSTOM_SIZE_ICON}
                    alt=""
                    width={40}
                    height={40}
                    className="shrink-0"
                  />
                  <div className="font-headline text-sm font-bold uppercase tracking-wide">
                    Your own size
                  </div>
                  {size === "custom" && <CheckBadge />}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <NumberField
                    label="Width (in)"
                    value={customWidth}
                    onChange={(v) => {
                      setSize("custom");
                      setCustomWidth(v);
                    }}
                  />
                  <span className="pb-2.5 text-lg font-bold text-foreground-muted">
                    ×
                  </span>
                  <NumberField
                    label="Height (in)"
                    value={customHeight}
                    onChange={(v) => {
                      setSize("custom");
                      setCustomHeight(v);
                    }}
                  />
                </div>
                <div className="mt-3 grid h-16 place-items-center">
                  <div
                    className="rounded-md border-2 border-[#d9f000]/70 bg-[#d9f000]/10"
                    style={{
                      aspectRatio: `${Math.max(customWidth, 0.5)} / ${Math.max(customHeight, 0.5)}`,
                      maxHeight: "100%",
                      maxWidth: "70%",
                    }}
                  />
                </div>
              </div>
            </Section>
            </div>
            <div className="order-4 lg:order-none">
            <Section step={4} title="How many?">
              <p className="mb-3 -mt-1 text-xs font-medium text-emerald-300">
                More stickers = bigger discount
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity("custom")}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    quantity === "custom" ? TILE_ON : TILE_OFF
                  }`}
                >
                  <span className="font-medium">Custom</span>
                  {quantity === "custom" && (
                    <span className="text-xs font-semibold text-foreground-muted tabular-nums">
                      {orderQty.toLocaleString()} pcs · ${(price.perUnit * orderQty).toFixed(2)}
                    </span>
                  )}
                </button>
                {quantity === "custom" && (
                  <div className="px-1 pt-1">
                    <NumberField
                      label={`Custom quantity (min ${MIN_CUSTOM_QTY})`}
                      value={customQty}
                      onChange={setCustomQty}
                      min={MIN_CUSTOM_QTY}
                      step={1}
                      integer
                    />
                  </div>
                )}
                {tierPrices.map(({ qty, total, savingsPercent }) => {
                  const active = quantity === qty;
                  return (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`w-full rounded-xl border px-3 pb-2 pt-2.5 text-left transition ${
                        active ? TILE_ON : TILE_OFF
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold tabular-nums">
                          {qty.toLocaleString()}
                          <span className="ml-2 text-xs font-normal text-foreground-muted">
                            ${(total / qty).toFixed(2)} each
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-bold tabular-nums">${total.toFixed(2)}</span>
                          {savingsPercent > 0 && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                              Save {savingsPercent}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-emerald-400 to-[#d9f000]"
                          style={{ width: `${savingsPercent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>
            </div>
            <div className="order-6 lg:order-none">
            {file && file.type.startsWith("image/") && (
              <div className="rounded-2xl border border-border-soft bg-white/3 p-3">
                <ProofModal
                  inline
                  open
                  file={file}
                  initialShape={shape as ProofShape}
                  initialBorder="thin"
                  initialRounded={
                    (shape === "square" || shape === "rectangle") && roundedCorners
                      ? "soft"
                      : ("none" as RoundedCorners)
                  }
                  widthIn={sizeInches().w}
                  heightIn={sizeInches().h}
                  registerApprove={(fn) => {
                    approveRef.current = fn;
                  }}
                  onClose={() => {}}
                  onApprove={(d) => void finalizeWithProof(d)}
                  onRequestChanges={(noteText, d) =>
                    void finalizeWithProof(d, noteText)
                  }
                />
              </div>
            )}
            </div>
          </div>

          {/* COL 3 */}
          <div className="contents lg:sticky lg:top-20 lg:block lg:space-y-5">
            <div className="order-5 lg:order-none">
            {/* Upload */}
            <Section step={5} title="Upload your design">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPT}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
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
                className={`relative flex min-h-40 min-w-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  dragActive
                    ? "border-[#d9f000] bg-[#d9f000]/10"
                    : "border-border-strong bg-white/2 hover:bg-white/5"
                }`}
              >
                {file ? (
                  <div className="flex w-full items-center gap-4 sm:gap-5">
                    <div className="relative h-24 w-24 shrink-0 sm:h-36 sm:w-36">
                      {filePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={filePreview}
                          alt="Upload preview"
                          className="h-24 w-24 rounded-xl bg-white/5 object-contain ring-1 ring-border-strong sm:h-36 sm:w-36"
                        />
                      ) : (
                        <div className="grid h-24 w-24 place-items-center rounded-xl bg-white/5 text-4xl sm:h-36 sm:w-36 sm:text-5xl">
                          📄
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 backdrop-blur-sm">
                          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-medium wrap-break-word text-foreground">
                        {file.name}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                      {isUploading && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#18d3e8]/15 px-2 py-0.5 text-[11px] font-semibold text-[#18d3e8]">
                          Uploading…
                        </div>
                      )}
                      {!isUploading && fileUrl && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          ✓ Uploaded
                        </div>
                      )}
                      {!isUploading && !fileUrl && uploadError && (
                        <div className="mt-2 max-w-md wrap-break-word rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
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
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="shrink-0 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadArt />
                    <div className="mt-3 font-headline text-base font-bold uppercase tracking-wide">
                      Upload your design
                    </div>
                    <div className="mt-1 text-xs text-foreground-muted">
                      PNG · JPG · PDF · SVG · AI
                    </div>
                  </>
                )}
              </div>
            </Section>

            </div>
            <div className="order-7 lg:order-none">
            {/* Instructions */}
            <Section step={6} title="Notes" optional>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Anything we should know?"
                className="w-full resize-none rounded-xl border border-border-soft bg-white/3 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-[#d9f000]/30 focus:ring-2"
              />
            </Section>
            </div>
            <div className="order-8 lg:order-none">
            <div className="space-y-3 rounded-2xl border border-border-soft bg-surface/70 p-4 backdrop-blur">
              {/* Total */}
              <div className="overflow-hidden rounded-2xl total-gradient p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-white/90">
                    Total
                  </span>
                  <span className="font-display text-3xl font-black text-white tabular-nums">
                    ${(price.perUnit * orderQty).toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 text-right text-xs font-medium text-white/80">
                  ${price.perUnit.toFixed(2)} / sticker
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-white/3 px-3 py-2 text-[12px] text-foreground-muted">
                <span>🕒</span>
                <span>Printed &amp; shipped next business day</span>
              </div>

              {/* CTA */}
              <button
                id="buy-button"
                type="button"
                onClick={handleCheckoutClick}
                disabled={ctaDisabled}
                className={`group flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider transition ${
                  !ctaDisabled
                    ? "accent-gradient text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110"
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
                    Buy now · ${(price.perUnit * orderQty).toFixed(2)}
                  </>
                ) : (
                  <>
                    <span>⬆</span>
                    Upload Artwork
                  </>
                )}
              </button>
              <p className="text-center text-xs text-foreground-muted">
                Check your proof, then Buy now.
              </p>
            </div>
            </div>
          </div>
        </div>

        {/* About + how to order — bottom, out of the way */}
        <div className="mt-10 grid gap-6 border-t border-border-soft pt-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">
              Tough <span className="accent-gradient-text">vinyl stickers</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-foreground-muted">
              Weatherproof, cut to your design, ready in days. Upload, check your proof, order.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["💦 Waterproof", "☀️ UV resistant", "✂️ Precision cut", "🖥️ Live proof"].map((t) => (
                <span key={t} className="rounded-full border border-border-soft bg-white/5 px-3 py-1 text-xs font-medium text-foreground/80">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border-soft shadow-lg shadow-black/30">
            <iframe
              loading="lazy"
              src={`https://www.youtube-nocookie.com/embed/${HOW_TO_ORDER_VIDEO_ID}`}
              title="How to order — Print Laser Stitch"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <MobileBuyBar total={price.perUnit * orderQty} targetId="buy-button" label="Upload & proof" />
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border-strong bg-surface-elevated px-5 py-3 text-sm shadow-2xl shadow-black/40">
          {toast}
        </div>
      )}

    </section>
  );
}

/* ----------------- subcomponents ----------------- */

const TILE_ON =
  "border-[#d9f000] bg-[#d9f000]/10 ring-1 ring-[#d9f000]/40 text-foreground";
const TILE_OFF =
  "border-border-soft bg-white/[0.03] text-foreground hover:bg-white/[0.06]";

function Section({
  step,
  title,
  optional,
  children,
}: {
  step: number;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface/70 p-5 backdrop-blur sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full accent-gradient text-xs font-black text-black">
          {step}
        </span>
        <h2 className="font-headline text-sm font-bold uppercase tracking-wider sm:text-base">
          {title}
        </h2>
        {optional && (
          <span className="text-xs font-normal text-foreground-muted">
            (optional)
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CheckBadge() {
  return (
    <span className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full accent-gradient text-black">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function OptionTile({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center rounded-2xl border px-3 py-4 transition ${
        active ? TILE_ON : TILE_OFF
      }`}
    >
      {active && (
        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full accent-gradient text-black">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      <Image
        src={icon}
        alt={label}
        width={56}
        height={56}
        className="h-14 w-14 object-contain transition-transform duration-500 ease-out group-hover:scale-110"
      />
      <span className="mt-2 text-center text-xs font-medium">{label}</span>
    </button>
  );
}

function SizeTile({
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
      className={`group relative flex flex-col items-center justify-center rounded-2xl border px-3 py-4 transition ${
        active ? TILE_ON : TILE_OFF
      }`}
    >
      {active && (
        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full accent-gradient text-black">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
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
  min = 0.5,
  step = 0.25,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  integer?: boolean;
}) {
  // Keep the raw text locally so the user can fully clear the field (empty
  // string) and type freely. We only push a valid number up to the parent;
  // on blur an empty/invalid value falls back to the last good number.
  const [text, setText] = useState<string>(String(value));
  const focused = useRef(false);

  // Sync when the value changes from outside (e.g. a popular-size preset),
  // but never while the user is actively typing in this field.
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  return (
    <label className="block">
      <span className="mb-1 block font-headline text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
        {label}
      </span>
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        step={step}
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const v = Number(raw);
          if (raw !== "" && Number.isFinite(v) && v > 0) {
            onChange(integer ? Math.floor(v) : v);
          }
        }}
        onBlur={() => {
          focused.current = false;
          const raw = Number(text);
          const v = integer ? Math.floor(raw) : raw;
          if (text.trim() === "" || !Number.isFinite(v) || v < min) {
            // Empty or below the minimum on blur — snap back to the last
            // valid value (or the minimum if there isn't one yet).
            const fallback =
              Number.isFinite(value) && value >= min ? value : min;
            setText(String(fallback));
            onChange(fallback);
          } else {
            setText(String(v));
            if (v !== raw) onChange(v);
          }
        }}
        className="w-full rounded-lg border border-border-soft bg-white/4 px-3 py-2 text-sm text-foreground outline-none ring-[#d9f000]/30 focus:ring-2"
      />
    </label>
  );
}

function UploadArt() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ua" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9f000" />
          <stop offset="1" stopColor="#18d3e8" />
        </linearGradient>
      </defs>
      <rect x="6" y="10" width="44" height="44" rx="10" fill="url(#ua)" />
      <path d="M50 28c0 12-10 22-22 22" stroke="#0b0b0b" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 42V24m0 0-8 8m8-8 8 8" stroke="#0b0b0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="48" r="10" fill="#d94cb3" />
      <path d="M50 53v-9m0 0-4 4m4-4 4 4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DieCutArt() {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 20 : 10;
    const a = (-90 + i * 36) * (Math.PI / 180);
    return `${(32 + r * Math.cos(a)).toFixed(1)},${(32 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden className="shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]">
      <defs>
        <linearGradient id="dc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9f000" />
          <stop offset=".55" stopColor="#18d3e8" />
          <stop offset="1" stopColor="#d94cb3" />
        </linearGradient>
      </defs>
      {/* white sticker border */}
      <polygon points={pts} fill="#fff" stroke="#fff" strokeWidth="9" strokeLinejoin="round" />
      {/* artwork */}
      <polygon points={pts} fill="url(#dc)" stroke="url(#dc)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="33" r="4" fill="#fff" fillOpacity=".85" />
    </svg>
  );
}

function ShapeArt({ kind }: { kind: "circle" | "oval" | "square" | "rectangle" }) {
  const id = `sa-${kind}`;
  const stops: Record<string, [string, string]> = {
    circle: ["#18d3e8", "#d9f000"],
    oval: ["#d94cb3", "#18d3e8"],
    square: ["#d9f000", "#d94cb3"],
    rectangle: ["#18d3e8", "#d94cb3"],
  };
  const [c1, c2] = stops[kind];
  const spark = (cx: number, cy: number, r: number) =>
    `M${cx} ${cy - r}L${cx + r * 0.3} ${cy - r * 0.3}L${cx + r} ${cy}L${cx + r * 0.3} ${cy + r * 0.3}L${cx} ${cy + r}L${cx - r * 0.3} ${cy + r * 0.3}L${cx - r} ${cy}L${cx - r * 0.3} ${cy - r * 0.3}Z`;
  return (
    <svg width="104" height="76" viewBox="0 0 104 76" fill="none" aria-hidden className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      {kind === "circle" && (
        <>
          <circle cx="52" cy="38" r="34" fill="#fff" />
          <circle cx="52" cy="38" r="29" fill={`url(#${id})`} />
          <path d={spark(52, 38, 16)} fill="#fff" fillOpacity=".92" />
        </>
      )}
      {kind === "oval" && (
        <>
          <ellipse cx="52" cy="38" rx="46" ry="30" fill="#fff" />
          <ellipse cx="52" cy="38" rx="41" ry="25" fill={`url(#${id})`} />
          <path d="M18 42c9-12 17 10 26 0s17 10 26 0 12-6 16-2" stroke="#fff" strokeOpacity=".9" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {kind === "square" && (
        <>
          <rect x="16" y="4" width="68" height="68" rx="12" fill="#fff" />
          <rect x="21" y="9" width="58" height="58" rx="8" fill={`url(#${id})`} />
          <circle cx="50" cy="38" r="16" stroke="#fff" strokeOpacity=".92" strokeWidth="4" />
          <circle cx="50" cy="38" r="5" fill="#fff" fillOpacity=".92" />
        </>
      )}
      {kind === "rectangle" && (
        <>
          <rect x="4" y="12" width="96" height="52" rx="10" fill="#fff" />
          <rect x="9" y="17" width="86" height="42" rx="6" fill={`url(#${id})`} />
          <path d="M9 30h86M9 46h86" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
          <path d={spark(52, 38, 11)} fill="#fff" fillOpacity=".95" />
        </>
      )}
    </svg>
  );
}
