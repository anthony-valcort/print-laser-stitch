/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PRINT_LOCATIONS,
  TSHIRT_MIN_QUANTITY,
  type PrintLocationKey,
} from "@/lib/tshirt-pricing";
import type { ShopifyImage, ShopifyProduct } from "@/lib/shopify-products";
import {
  colorHex,
  isColorOption,
  isSizeOption,
} from "@/components/configurator/colors";
import { Section } from "@/components/configurator/Section";
import { ColorSwatch } from "@/components/configurator/ColorSwatch";
import { ProductGallery } from "@/components/configurator/ProductGallery";
import {
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";
import { SizeQtyStepper } from "@/components/configurator/QuantityStepper";
import { ExpandableDescription } from "@/components/configurator/ExpandableDescription";

// Frontend-only color fallback when Shopify hasn't exposed Color as a variant
// option. Skipped automatically when Shopify already has Color.
const DEFAULT_FALLBACK_COLORS = [
  "White",
  "Black",
  "Gray",
  "Red",
  "Navy",
] as const;

export type ApparelConfiguratorProps = {
  product: ShopifyProduct;
  /** Override the badge shown above the title. */
  badge?: string;
  /** Min total quantity (sum of all sizes). Defaults to T-shirt's 12. */
  minQuantity?: number;
  /** Show the front/back/both print location section. Off for embroidered apparel. */
  showPrintLocations?: boolean;
  /** Single-design upload label when print location is hidden (e.g. "Embroidery Artwork"). */
  singleUploadLabel?: string;
  /** Frontend-only color list (used only when Shopify has no Color option). */
  fallbackColors?: readonly string[];
};

export default function TShirtConfigurator({
  product,
  badge,
  minQuantity: minQuantityProp,
  showPrintLocations = true,
  singleUploadLabel = "Design",
  fallbackColors = DEFAULT_FALLBACK_COLORS,
}: ApparelConfiguratorProps) {
  const minQuantity = minQuantityProp ?? TSHIRT_MIN_QUANTITY;
  // Separate "Size" out from the other options — Size becomes a per-size
  // quantity matrix instead of a single picker.
  const sizeOption = product.options.find((o) => isSizeOption(o.name));
  const nonSizeOptions = product.options.filter((o) => !isSizeOption(o.name));

  const firstAvailable =
    product.variants.find((v) => v.availableForSale) ?? product.variants[0];

  // Non-size selectedOptions (Fabric, Sleeve Type, etc.).
  const initialNonSizeOpts: Record<string, string> = useMemo(() => {
    const init: Record<string, string> = {};
    for (const opt of nonSizeOptions) {
      const fromVariant = firstAvailable?.selectedOptions.find(
        (o) => o.name === opt.name,
      )?.value;
      init[opt.name] = fromVariant ?? opt.values[0];
    }
    return init;
  }, [nonSizeOptions, firstAvailable]);

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(initialNonSizeOpts);

  const setOption = (name: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [name]: value }));
  };

  // Per-size quantity map. Anthony asked: don't auto-fill, customer fills in
  // qty per size, and total must hit min 12.
  const initialSizeQuantities: Record<string, number> = useMemo(() => {
    const init: Record<string, number> = {};
    if (sizeOption) for (const v of sizeOption.values) init[v] = 0;
    return init;
  }, [sizeOption]);

  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(
    initialSizeQuantities,
  );

  const setSizeQty = (size: string, n: number) => {
    setSizeQuantities((prev) => ({ ...prev, [size]: Math.max(0, n) }));
  };

  // If Shopify already exposes Color as an option, hide the frontend picker.
  const hasShopifyColor = product.options.some((o) => isColorOption(o.name));

  const [printLocation, setPrintLocation] = useState<PrintLocationKey>("front");
  const [instructions, setInstructions] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [shirtColor, setShirtColor] = useState<string>(fallbackColors[0]);

  const [frontUpload, setFrontUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);
  const [backUpload, setBackUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Find variant for a specific size, given the current non-size selection.
  function variantForSize(sizeName: string) {
    return product.variants.find((v) =>
      v.selectedOptions.every((opt) => {
        if (sizeOption && opt.name === sizeOption.name) {
          return opt.value === sizeName;
        }
        return selectedOptions[opt.name] === opt.value;
      }),
    );
  }

  // Reference variant (non-size match) — used for gallery image, per-shirt
  // price display, and reacting to fabric/sleeve changes.
  const referenceVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) =>
          v.availableForSale &&
          v.selectedOptions.every((opt) => {
            if (sizeOption && opt.name === sizeOption.name) return true;
            return selectedOptions[opt.name] === opt.value;
          }),
      ) ?? product.variants[0]
    );
  }, [product.variants, sizeOption, selectedOptions]);

  const perShirtPrice = referenceVariant ? Number(referenceVariant.price) : 0;

  // Total quantity across all sizes.
  const totalQuantity = useMemo(
    () => Object.values(sizeQuantities).reduce((a, b) => a + b, 0),
    [sizeQuantities],
  );

  // Total price = sum of (qty × variant_price) per size with qty > 0.
  const totalPrice = useMemo(() => {
    let total = 0;
    for (const [size, qty] of Object.entries(sizeQuantities)) {
      if (qty <= 0) continue;
      const v = variantForSize(size);
      if (v) total += Number(v.price) * qty;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeQuantities, selectedOptions, product.variants]);

  // Build gallery: reference variant image first, then product images, dedup'd.
  const galleryImages = useMemo<ShopifyImage[]>(() => {
    const imgs: ShopifyImage[] = [];
    if (referenceVariant?.image) imgs.push(referenceVariant.image);
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
  }, [referenceVariant, product.images, product.featuredImage]);

  // When the reference variant changes (fabric/sleeve), jump to its image.
  useEffect(() => {
    setGalleryIdx(0);
  }, [referenceVariant?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Validation: each enabled upload slot needs a successful file. When print
  // locations are hidden, the front slot is the single design and back is
  // unused.
  const needsFront =
    !showPrintLocations ||
    printLocation === "front" ||
    printLocation === "both";
  const needsBack =
    showPrintLocations &&
    (printLocation === "back" || printLocation === "both");
  const frontReady =
    !needsFront || (!!frontUpload.fileUrl && !frontUpload.isUploading);
  const backReady =
    !needsBack || (!!backUpload.fileUrl && !backUpload.isUploading);
  const anyUploading = frontUpload.isUploading || backUpload.isUploading;

  const qtyOk = totalQuantity >= minQuantity;
  const canCheckout =
    qtyOk &&
    frontReady &&
    backReady &&
    !anyUploading &&
    !isCheckingOut;

  async function handleAddToCart() {
    if (!canCheckout) return;

    // Build per-size line items from the qty matrix.
    const sizeVariants: Array<{
      variantId: string;
      size: string;
      quantity: number;
    }> = [];
    for (const [size, qty] of Object.entries(sizeQuantities)) {
      if (qty <= 0) continue;
      const v = variantForSize(size);
      if (!v) {
        setToast(
          `No variant found for ${size} with the selected fabric/sleeve combination.`,
        );
        return;
      }
      sizeVariants.push({ variantId: v.id, size, quantity: qty });
    }
    if (sizeVariants.length === 0) {
      setToast("Please enter quantities for at least one size.");
      return;
    }

    setIsCheckingOut(true);
    setToast(null);

    try {
      const response = await fetch("/api/checkout-tshirt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizeVariants,
          selectedOptions,
          // Only send print location for products that expose it (T-shirts).
          // For embroidered apparel (polos) we skip it.
          printLocation: showPrintLocations ? printLocation : undefined,
          uploadLabel: showPrintLocations ? undefined : singleUploadLabel,
          instructions,
          phone: phone.trim() || undefined,
          shirtColor: hasShopifyColor ? undefined : shirtColor,
          frontFileUrl: frontUpload.fileUrl ?? undefined,
          frontFileName: frontUpload.file?.name,
          backFileUrl: backUpload.fileUrl ?? undefined,
          backFileName: backUpload.file?.name,
        }),
      });
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
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
                {badge ?? `Custom apparel · min ${minQuantity} pcs`}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {product.title}
              </h1>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-bold accent-gradient-text">
                  ${perShirtPrice.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-foreground-muted">
                  per shirt
                </span>
              </div>
            </div>

            {/* Description */}
            {product.descriptionHtml && (
              <ExpandableDescription
                html={product.descriptionHtml}
                className="prose-sm rounded-xl border border-border-soft bg-white/3 px-4 py-3 text-sm leading-relaxed text-foreground-muted [&_a]:text-accent [&_a]:underline"
              />
            )}

            {/* Non-size product options (Fabric, Sleeve Type, Color, …) */}
            {nonSizeOptions.map((opt) => {
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

            {/* Size matrix — qty per size, total ≥ minQuantity */}
            {sizeOption && (
              <Section
                title={`${sizeOption.name} & quantity`}
                value={`${totalQuantity} / min ${minQuantity}`}
                icon={
                  totalQuantity >= minQuantity ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-amber-400">!</span>
                  )
                }
              >
                <div className="overflow-hidden rounded-xl border border-border-soft bg-white/3">
                  {sizeOption.values.map((sz, i) => {
                    const v = variantForSize(sz);
                    const soldOut = v && !v.availableForSale;
                    const qty = sizeQuantities[sz] ?? 0;
                    return (
                      <div
                        key={sz}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                          i > 0 ? "border-t border-border-soft" : ""
                        } ${soldOut ? "opacity-50" : ""}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-10 text-sm font-bold text-foreground">
                            {sz}
                          </span>
                          {soldOut && (
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                              Sold out
                            </span>
                          )}
                        </div>
                        <SizeQtyStepper
                          value={qty}
                          disabled={!!soldOut}
                          onChange={(n) => setSizeQty(sz, n)}
                        />
                      </div>
                    );
                  })}
                </div>
                {totalQuantity > 0 && totalQuantity < minQuantity && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    Add {minQuantity - totalQuantity} more to reach the
                    minimum order of {minQuantity}.
                  </p>
                )}
              </Section>
            )}

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
                  {fallbackColors.map((c) => (
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

            {/* Print location (only shown for products that have it) */}
            {showPrintLocations && (
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
            )}

            {/* Conditional design upload(s) */}
            <Section
              title={
                showPrintLocations
                  ? "Upload your design"
                  : `Upload your ${singleUploadLabel.toLowerCase()}`
              }
            >
              <div
                className={`grid gap-3 ${
                  needsFront && needsBack ? "sm:grid-cols-2" : "grid-cols-1"
                }`}
              >
                {needsFront && (
                  <UploadBox
                    label={
                      showPrintLocations
                        ? "Front design"
                        : undefined
                    }
                    slot={frontUpload}
                    onSelect={(f) => uploadDesign(f, setFrontUpload)}
                    onClear={() => setFrontUpload(EMPTY_UPLOAD_SLOT)}
                  />
                )}
                {needsBack && (
                  <UploadBox
                    label="Back design"
                    slot={backUpload}
                    onSelect={(f) => uploadDesign(f, setBackUpload)}
                    onClear={() => setBackUpload(EMPTY_UPLOAD_SLOT)}
                  />
                )}
              </div>
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

            {/* Order summary + Total */}
            <div className="overflow-hidden rounded-2xl total-gradient p-5">
              {totalQuantity > 0 && (
                <div className="mb-3 space-y-1 border-b border-white/15 pb-3 text-xs font-medium text-white/85">
                  {Object.entries(sizeQuantities)
                    .filter(([, q]) => q > 0)
                    .map(([size, qty]) => {
                      const v = variantForSize(size);
                      const lineTotal = v ? Number(v.price) * qty : 0;
                      return (
                        <div
                          key={size}
                          className="flex items-baseline justify-between gap-2"
                        >
                          <span>
                            {qty} × {size}
                          </span>
                          <span className="font-semibold">
                            ${lineTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-white/90">
                  {totalQuantity} {totalQuantity === 1 ? "shirt" : "shirts"}
                </span>
                <span className="text-3xl font-bold text-white">
                  ${totalPrice.toFixed(2)}
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
              ) : !qtyOk ? (
                totalQuantity === 0
                  ? "Pick sizes & quantities to continue"
                  : `Add ${minQuantity - totalQuantity} more to reach min ${minQuantity}`
              ) : !frontReady || !backReady ? (
                <>
                  <span>⬆</span>
                  Upload {needsFront && needsBack ? "both designs" : "design"} to continue
                </>
              ) : (
                <>
                  <span>🛒</span>
                  Add to Cart · ${totalPrice.toFixed(2)}
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
