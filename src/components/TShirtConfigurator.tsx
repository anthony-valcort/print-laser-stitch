/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRINT_LOCATIONS,
  TSHIRT_MIN_QUANTITY,
  type PrintLocationKey,
  calcTShirtPrice,
} from "@/lib/tshirt-pricing";
import type { ShopifyImage, ShopifyProduct } from "@/lib/shopify-products";

const ACCEPT =
  ".png,.jpg,.jpeg,.pdf,.svg,.ai,image/png,image/jpeg,image/svg+xml,application/pdf";

const COLOR_HEX: Record<string, string> = {
  black: "#0b0b0b",
  white: "#f7f7f7",
  navy: "#1c2940",
  "navy blue": "#1c2940",
  red: "#c93434",
  "royal blue": "#1f4ec9",
  blue: "#2563eb",
  "sky blue": "#7dd3fc",
  "light blue": "#bae6fd",
  green: "#16a34a",
  "forest green": "#1b5e20",
  "kelly green": "#22c55e",
  "lime green": "#a3e635",
  yellow: "#fde047",
  orange: "#f97316",
  pink: "#ec4899",
  "hot pink": "#f43f5e",
  purple: "#7c3aed",
  maroon: "#7f1d1d",
  burgundy: "#7f1d1d",
  brown: "#78350f",
  tan: "#d2b48c",
  beige: "#e9dcc4",
  grey: "#6b7280",
  gray: "#6b7280",
  "heather grey": "#a3a3a3",
  "heather gray": "#a3a3a3",
  "charcoal grey": "#374151",
  "charcoal gray": "#374151",
  charcoal: "#374151",
  silver: "#cbd5e1",
  gold: "#d4af37",
};

function colorHex(name: string): string | null {
  return COLOR_HEX[name.toLowerCase().trim()] ?? null;
}

function isColorOption(name: string): boolean {
  return name.toLowerCase() === "color" || name.toLowerCase() === "colour";
}
function isSizeOption(name: string): boolean {
  return name.toLowerCase() === "size";
}

// Frontend-only color choices — Anthony's Shopify product doesn't yet expose
// Color as a variant option, so the customer's choice rides along as a line
// item property on the order. Common DTG/screen-print apparel colors.
const SHIRT_COLORS = ["White", "Black", "Gray", "Red", "Navy"] as const;

type UploadSlot = {
  file: File | null;
  fileUrl: string | null;
  isUploading: boolean;
  error: string | null;
};

const EMPTY_SLOT: UploadSlot = {
  file: null,
  fileUrl: null,
  isUploading: false,
  error: null,
};

export default function TShirtConfigurator({
  product,
}: {
  product: ShopifyProduct;
}) {
  // Pick the first available variant as the initial selection.
  const firstAvailable =
    product.variants.find((v) => v.availableForSale) ?? product.variants[0];
  const initialOpts: Record<string, string> = useMemo(() => {
    const init: Record<string, string> = {};
    for (const opt of product.options) {
      const fromVariant = firstAvailable?.selectedOptions.find(
        (o) => o.name === opt.name,
      )?.value;
      init[opt.name] = fromVariant ?? opt.values[0];
    }
    return init;
  }, [product.options, firstAvailable]);

  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string>>(initialOpts);

  const setOption = (name: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [name]: value }));
  };

  // If Shopify already exposes Color as an option, hide the frontend picker.
  const hasShopifyColor = product.options.some((o) => isColorOption(o.name));

  const [printLocation, setPrintLocation] = useState<PrintLocationKey>("front");
  const [quantity, setQuantity] = useState<number>(TSHIRT_MIN_QUANTITY);
  const [instructions, setInstructions] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [shirtColor, setShirtColor] = useState<string>(SHIRT_COLORS[0]);

  const [frontUpload, setFrontUpload] = useState<UploadSlot>(EMPTY_SLOT);
  const [backUpload, setBackUpload] = useState<UploadSlot>(EMPTY_SLOT);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Resolve current variant: every selected option must match.
  const currentVariant = useMemo(() => {
    return product.variants.find((v) =>
      v.selectedOptions.every(
        (opt) => selectedOptions[opt.name] === opt.value,
      ),
    );
  }, [product.variants, selectedOptions]);

  const variantPrice = currentVariant ? Number(currentVariant.price) : 0;

  const price = useMemo(
    () =>
      calcTShirtPrice({
        variantPrice,
        printLocation,
        quantity,
      }),
    [variantPrice, printLocation, quantity],
  );

  // Build gallery: variant image first (if any), then product images, dedup'd.
  const galleryImages = useMemo<ShopifyImage[]>(() => {
    const imgs: ShopifyImage[] = [];
    if (currentVariant?.image) imgs.push(currentVariant.image);
    if (
      product.featuredImage &&
      !imgs.some((i) => i.url === product.featuredImage!.url)
    ) {
      imgs.push(product.featuredImage);
    }
    for (const img of product.images) {
      if (!imgs.some((i) => i.url === img.url)) imgs.push(img);
    }
    return imgs;
  }, [currentVariant, product.images, product.featuredImage]);

  // When the variant changes, jump back to its representative image.
  useEffect(() => {
    setGalleryIdx(0);
  }, [currentVariant?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Generic upload routine reused by both upload slots.
  async function uploadDesign(
    f: File,
    set: React.Dispatch<React.SetStateAction<UploadSlot>>,
  ) {
    set({ file: f, fileUrl: null, isUploading: true, error: null });

    try {
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
        throw new Error(
          "error" in stage ? stage.error : "Could not get upload target",
        );
      }

      const fd = new FormData();
      for (const param of stage.parameters) fd.append(param.name, param.value);
      fd.append("file", f);

      const uploadResp = await fetch(stage.url, { method: "POST", body: fd });
      if (!uploadResp.ok) {
        const text = await uploadResp.text();
        throw new Error(
          `Upload to staging failed (${uploadResp.status}): ${text.slice(0, 200)}`,
        );
      }

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
        throw new Error(
          "error" in registered ? registered.error : "Failed to register file",
        );
      }

      set({
        file: f,
        fileUrl: registered.url,
        isUploading: false,
        error: null,
      });
    } catch (err) {
      set({
        file: f,
        fileUrl: null,
        isUploading: false,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  // Validation: each enabled location needs a successfully uploaded file.
  const needsFront = printLocation === "front" || printLocation === "both";
  const needsBack = printLocation === "back" || printLocation === "both";
  const frontReady = !needsFront || (!!frontUpload.fileUrl && !frontUpload.isUploading);
  const backReady = !needsBack || (!!backUpload.fileUrl && !backUpload.isUploading);
  const anyUploading = frontUpload.isUploading || backUpload.isUploading;

  const variantUnavailable = currentVariant && !currentVariant.availableForSale;
  const qtyOk = quantity >= TSHIRT_MIN_QUANTITY;
  const canCheckout =
    !!currentVariant &&
    !variantUnavailable &&
    frontReady &&
    backReady &&
    !anyUploading &&
    !isCheckingOut &&
    qtyOk;

  async function handleAddToCart() {
    if (!canCheckout || !currentVariant) return;
    setIsCheckingOut(true);
    setToast(null);

    try {
      const response = await fetch("/api/checkout-tshirt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: currentVariant.id,
          selectedOptions,
          printLocation,
          quantity,
          instructions,
          phone: phone.trim() || undefined,
          shirtColor: hasShopifyColor ? undefined : shirtColor,
          frontFileUrl: frontUpload.fileUrl ?? undefined,
          frontFileName: frontUpload.file?.name,
          backFileUrl: backUpload.fileUrl ?? undefined,
          backFileName: backUpload.file?.name,
        }),
      });
      const data = (await response.json()) as {
        invoiceUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.invoiceUrl) {
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.invoiceUrl;
    } catch (err) {
      setIsCheckingOut(false);
      setToast(`Error: ${err instanceof Error ? err.message : "Checkout failed"}`);
    }
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
          <span className="font-medium">{product.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-12">
          {/* LEFT: Sticky gallery */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ProductGallery
              images={galleryImages}
              idx={galleryIdx}
              setIdx={setGalleryIdx}
              title={product.title}
            />
          </div>

          {/* RIGHT: Configurator */}
          <div className="space-y-6">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Custom apparel · min {TSHIRT_MIN_QUANTITY} pcs
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {product.title}
              </h1>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-bold accent-gradient-text">
                  ${price.perUnit.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-foreground-muted">
                  per shirt
                </span>
              </div>
            </div>

            {/* Description */}
            {product.descriptionHtml && (
              <div
                className="prose-sm rounded-xl border border-border-soft bg-white/3 px-4 py-3 text-sm leading-relaxed text-foreground-muted [&_a]:text-accent [&_a]:underline [&_p+p]:mt-2"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            )}

            {/* All product options (Fabric, Sleeve Type, Color, Size, …) */}
            {product.options.map((opt) => {
              const value = selectedOptions[opt.name];
              if (isColorOption(opt.name)) {
                return (
                  <Section
                    key={opt.id}
                    title={opt.name}
                    value={value}
                    icon={
                      <span
                        className="h-4 w-4 rounded-full border border-white/20"
                        style={{ background: colorHex(value) ?? "#888" }}
                      />
                    }
                  >
                    <div className="flex flex-wrap gap-2.5">
                      {opt.values.map((v) => (
                        <ColorSwatch
                          key={v}
                          name={v}
                          active={v === value}
                          onClick={() => setOption(opt.name, v)}
                        />
                      ))}
                    </div>
                  </Section>
                );
              }
              if (isSizeOption(opt.name)) {
                return (
                  <Section key={opt.id} title={opt.name} value={value}>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {opt.values.map((v) => {
                        const variantForValue = product.variants.find((variant) =>
                          variant.selectedOptions.every((o) =>
                            o.name === opt.name
                              ? o.value === v
                              : selectedOptions[o.name] === o.value,
                          ),
                        );
                        const soldOut =
                          variantForValue && !variantForValue.availableForSale;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setOption(opt.name, v)}
                            className={`relative rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                              v === value
                                ? "border-highlight bg-highlight-soft"
                                : "border-border-soft bg-white/3 hover:bg-white/6"
                            } ${soldOut ? "opacity-50" : ""}`}
                          >
                            {v}
                            {soldOut && (
                              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[8px] font-bold text-white">
                                !
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                );
              }
              // Generic pill picker for Fabric, Sleeve Type, etc.
              return (
                <Section key={opt.id} title={opt.name} value={value}>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setOption(opt.name, v)}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                          v === value
                            ? "border-highlight bg-highlight-soft"
                            : "border-border-soft bg-white/3 hover:bg-white/6"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </Section>
              );
            })}

            {/* Frontend-only color picker (when Shopify product has no Color option) */}
            {!hasShopifyColor && (
              <Section
                title="Shirt color"
                value={shirtColor}
                icon={
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ background: colorHex(shirtColor) ?? "#888" }}
                  />
                }
              >
                <div className="flex flex-wrap gap-2.5">
                  {SHIRT_COLORS.map((c) => (
                    <ColorSwatch
                      key={c}
                      name={c}
                      active={c === shirtColor}
                      onClick={() => setShirtColor(c)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Print location */}
            <Section title="Print location">
              <div className="grid grid-cols-3 gap-2">
                {PRINT_LOCATIONS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPrintLocation(p.key)}
                    className={`flex flex-col items-center justify-center rounded-xl border px-3 py-4 text-center transition ${
                      printLocation === p.key
                        ? "border-highlight bg-highlight-soft"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="mt-1.5 text-xs font-semibold">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Conditional design upload(s) */}
            <Section title="Upload your design">
              <div
                className={`grid gap-3 ${
                  needsFront && needsBack ? "sm:grid-cols-2" : "grid-cols-1"
                }`}
              >
                {needsFront && (
                  <UploadBox
                    label="Front design"
                    slot={frontUpload}
                    onSelect={(f) => uploadDesign(f, setFrontUpload)}
                    onClear={() => setFrontUpload(EMPTY_SLOT)}
                  />
                )}
                {needsBack && (
                  <UploadBox
                    label="Back design"
                    slot={backUpload}
                    onSelect={(f) => uploadDesign(f, setBackUpload)}
                    onClear={() => setBackUpload(EMPTY_SLOT)}
                  />
                )}
              </div>
            </Section>

            {/* Quantity */}
            <Section title={`Quantity (min ${TSHIRT_MIN_QUANTITY})`}>
              <QuantityStepper
                value={quantity}
                min={TSHIRT_MIN_QUANTITY}
                onChange={setQuantity}
              />
            </Section>

            {/* Phone (optional) */}
            <Section title="Phone number (optional)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                suppressHydrationWarning
              />
              <p className="mt-1.5 text-[11px] text-foreground-muted">
                Optional — we&apos;ll text you if there&apos;s something to
                confirm about the artwork.
              </p>
            </Section>

            {/* Instructions */}
            <Section title="Notes for our printer (optional)">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Any special requests — e.g. 'Center logo on chest', 'Use a 3-inch print width'…"
                className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                suppressHydrationWarning
              />
            </Section>

            {/* Total + CTA */}
            <div className="overflow-hidden rounded-2xl total-gradient p-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-white/90">
                  {quantity} ×{" "}
                  {Object.values(selectedOptions).slice(0, 3).join(" / ")}
                </span>
                <span className="text-3xl font-bold text-white">
                  ${price.total.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 text-right text-xs font-medium text-white/80">
                Free online proofs · Printed in 24–48h
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canCheckout}
              className={`group flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition ${
                canCheckout
                  ? "bg-highlight text-yellow-950 shadow-lg shadow-highlight/20 hover:brightness-105"
                  : "cursor-not-allowed border border-border-soft bg-white/4 text-foreground-muted"
              }`}
            >
              {isCheckingOut ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating order…
                </>
              ) : anyUploading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading file…
                </>
              ) : variantUnavailable ? (
                "This variant is sold out"
              ) : !qtyOk ? (
                `Minimum ${TSHIRT_MIN_QUANTITY} units required`
              ) : !frontReady || !backReady ? (
                <>
                  <span>⬆</span>
                  Upload {needsFront && needsBack ? "both designs" : "design"} to continue
                </>
              ) : (
                <>
                  <span>🛒</span>
                  Add to Cart · ${price.total.toFixed(2)}
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-foreground-muted">
              You&apos;ll be redirected to Shopify checkout.
            </p>
          </div>
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

/* ---------- Subcomponents ---------- */

function ProductGallery({
  images,
  idx,
  setIdx,
  title,
}: {
  images: ShopifyImage[];
  idx: number;
  setIdx: (i: number) => void;
  title: string;
}) {
  const main = images[idx] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border-soft bg-surface">
        {main ? (
          <Image
            src={main.url}
            alt={main.altText ?? title}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain p-6"
            priority
          />
        ) : (
          <div className="grid h-full place-items-center text-7xl text-foreground-muted/40">
            👕
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative aspect-square overflow-hidden rounded-xl border bg-surface transition ${
                i === idx
                  ? "border-highlight ring-2 ring-highlight/40"
                  : "border-border-soft hover:border-border-strong"
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? `${title} thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  value,
  icon,
  children,
}: {
  title: string;
  value?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        {value && (
          <span className="flex items-center gap-1.5 text-sm text-foreground-muted">
            {icon}
            <span className="text-foreground">{value}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ColorSwatch({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const hex = colorHex(name);
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className={`group relative flex items-center gap-2 rounded-full border px-1 py-1 transition ${
        active
          ? "border-highlight bg-highlight-soft"
          : "border-border-soft bg-white/3 hover:bg-white/6"
      }`}
    >
      {hex ? (
        <span
          className="h-7 w-7 rounded-full border border-white/15 shadow-inner"
          style={{ background: hex }}
        />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[10px] font-bold uppercase text-foreground">
          {name.slice(0, 2)}
        </span>
      )}
      <span className="pr-3 text-xs font-medium">{name}</span>
    </button>
  );
}

function QuantityStepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-2xl border border-border-soft bg-white/3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-4 py-3 text-lg font-bold text-foreground/80 hover:text-foreground"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Number.isFinite(v) && v >= min ? v : min);
          }}
          className="w-16 bg-transparent text-center text-base font-semibold outline-none"
          suppressHydrationWarning
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="px-4 py-3 text-lg font-bold text-foreground/80 hover:text-foreground"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <div className="text-xs text-foreground-muted">
        Bulk pricing applies — min {min} pcs
      </div>
    </div>
  );
}

function UploadBox({
  label,
  slot,
  onSelect,
  onClear,
}: {
  label: string;
  slot: UploadSlot;
  onSelect: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!slot.file || !slot.file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(slot.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slot.file]);

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
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
          const f = e.dataTransfer.files?.[0];
          if (f) onSelect(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
          dragActive
            ? "border-highlight bg-highlight-soft"
            : "border-border-strong bg-surface/60 hover:bg-white/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelect(f);
          }}
        />
        {slot.file ? (
          <div className="flex w-full items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Upload preview"
                  className="h-16 w-16 rounded-lg object-contain bg-white/5 ring-1 ring-border-strong"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-lg bg-white/5 text-2xl">
                  📄
                </div>
              )}
              {slot.isUploading && (
                <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/50 backdrop-blur-sm">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div className="flex-1 truncate text-left">
              <div className="truncate text-xs font-medium text-foreground">
                {slot.file.name}
              </div>
              <div className="text-[11px] text-foreground-muted">
                {(slot.file.size / 1024).toFixed(1)} KB
              </div>
              {slot.isUploading && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                  Uploading…
                </div>
              )}
              {!slot.isUploading && slot.fileUrl && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  ✓ Uploaded
                </div>
              )}
              {!slot.isUploading && !slot.fileUrl && slot.error && (
                <div className="mt-1 max-w-full truncate rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                  ⚠ {slot.error}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="rounded-full border border-border-soft bg-white/5 px-2 py-0.5 text-[10px] hover:bg-white/10"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-highlight text-base">
              ⬆
            </div>
            <div className="mt-2 text-xs font-semibold">
              Drop or click to upload
            </div>
            <div className="mt-0.5 text-[10px] text-foreground-muted">
              PNG · JPG · PDF · SVG · AI · ≤20MB
            </div>
          </>
        )}
      </div>
    </div>
  );
}
