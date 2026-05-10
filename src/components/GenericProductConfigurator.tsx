"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ShopifyImage, ShopifyProduct } from "@/lib/shopify-products";
import { colorHex, isColorOption } from "@/components/configurator/colors";
import { Section } from "@/components/configurator/Section";
import { ColorSwatch } from "@/components/configurator/ColorSwatch";
import { ProductGallery } from "@/components/configurator/ProductGallery";
import {
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";
import { QuantityStepper } from "@/components/configurator/QuantityStepper";
import { ExpandableDescription } from "@/components/configurator/ExpandableDescription";

export type GenericProductConfiguratorProps = {
  product: ShopifyProduct;
  /** Customer-facing badge shown above title. */
  badge?: string;
  /** Min order quantity. Defaults to 1. */
  minQuantity?: number;
  /**
   * - "auto" (default): detect from a Shopify "Print Sides" / "Layout"
   *   option — single uploader unless the customer picks something
   *   indicating both sides ("Front and Back", "Double-sided", etc.)
   * - "single": always one uploader
   * - "front-back": always two uploaders (front + back required)
   * - "none": no uploader rendered
   */
  uploadMode?: "auto" | "single" | "front-back" | "none";
  /** When uploadMode is "single", what to call the design (defaults to "Design"). */
  uploadLabel?: string;
  /** Image fallback emoji when no images. */
  fallbackEmoji?: string;
  /** Extra info banner shown above options (e.g. shipping address for engraved-cups). */
  notice?: React.ReactNode;
};

// Detect a Shopify option that controls print sides — Flyers calls it
// "Print Sides", Banners calls it "Layout", others might just say "Sides".
function findSidesOption(productOptions: { name: string; values: string[] }[]) {
  return productOptions.find((o) =>
    /^(print\s*sides|sides|layout)$/i.test(o.name.trim()),
  );
}

function valueIndicatesBothSides(value: string | undefined): boolean {
  if (!value) return false;
  return /both|double|front\s*(?:and|\&|\+)\s*back|2[\s-]*sided|two[\s-]*sided/i.test(
    value,
  );
}

export default function GenericProductConfigurator({
  product,
  badge,
  minQuantity = 1,
  uploadMode = "auto",
  uploadLabel = "Design",
  fallbackEmoji = "📦",
  notice,
}: GenericProductConfiguratorProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.options, firstAvailable?.id]);

  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string>>(initialOpts);

  const setOption = (name: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [name]: value }));
  };

  // Some Shopify products (Flyers, Business Cards, Cups, Bottle Openers)
  // already encode quantity tiers as a variant option (e.g. "100", "250").
  // When that's the case, we hide our own quantity stepper and treat the
  // selected variant as a single line item with qty=1 — Anthony's variant
  // already represents the count.
  const hasQuantityOption = product.options.some(
    (o) => o.name.toLowerCase() === "quantity",
  );

  const [quantity, setQuantity] = useState<number>(minQuantity);
  const [instructions, setInstructions] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const [frontUpload, setFrontUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);
  const [backUpload, setBackUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Resolve current variant from all selected options.
  const currentVariant = useMemo(() => {
    return product.variants.find((v) =>
      v.selectedOptions.every(
        (opt) => selectedOptions[opt.name] === opt.value,
      ),
    );
  }, [product.variants, selectedOptions]);

  const variantPrice = currentVariant ? Number(currentVariant.price) : 0;
  const effectiveQty = hasQuantityOption ? 1 : Math.max(1, quantity);
  const total = variantPrice * effectiveQty;

  // Build gallery: variant image first, then product images, dedup'd.
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

  useEffect(() => {
    setGalleryIdx(0);
  }, [currentVariant?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Resolve effective upload mode. In "auto", inspect the product's print-
  // sides option (if any) and use the customer's selected value.
  let effectiveUploadMode: "single" | "front-back" | "none";
  if (uploadMode === "auto") {
    const sidesOpt = findSidesOption(product.options);
    const selectedSidesValue = sidesOpt
      ? selectedOptions[sidesOpt.name]
      : undefined;
    effectiveUploadMode = valueIndicatesBothSides(selectedSidesValue)
      ? "front-back"
      : "single";
  } else {
    effectiveUploadMode = uploadMode;
  }

  const needsFront =
    effectiveUploadMode === "single" || effectiveUploadMode === "front-back";
  const needsBack = effectiveUploadMode === "front-back";
  const frontReady =
    !needsFront || (!!frontUpload.fileUrl && !frontUpload.isUploading);
  const backReady =
    !needsBack || (!!backUpload.fileUrl && !backUpload.isUploading);
  const anyUploading = frontUpload.isUploading || backUpload.isUploading;

  // Anthony's print-on-demand shop doesn't track stock per variant, so we
  // ignore availableForSale visually. The Draft Order API doesn't require
  // it either.
  const qtyOk = hasQuantityOption || quantity >= minQuantity;
  const canCheckout =
    !!currentVariant &&
    qtyOk &&
    frontReady &&
    backReady &&
    !anyUploading &&
    !isCheckingOut;

  async function handleAddToCart() {
    if (!canCheckout || !currentVariant) return;
    setIsCheckingOut(true);
    setToast(null);

    const extraProperties: Record<string, string> = {};
    if (effectiveUploadMode === "single" && frontUpload.fileUrl) {
      extraProperties[`${uploadLabel} File`] = frontUpload.fileUrl;
      if (frontUpload.file?.name) {
        extraProperties[`${uploadLabel} Filename`] = frontUpload.file.name;
      }
    } else if (effectiveUploadMode === "front-back") {
      if (frontUpload.fileUrl) {
        extraProperties["Front Design"] = frontUpload.fileUrl;
        if (frontUpload.file?.name) {
          extraProperties["Front Design Filename"] = frontUpload.file.name;
        }
      }
      if (backUpload.fileUrl) {
        extraProperties["Back Design"] = backUpload.fileUrl;
        if (backUpload.file?.name) {
          extraProperties["Back Design Filename"] = backUpload.file.name;
        }
      }
    }
    if (phone.trim()) extraProperties["Phone Number"] = phone.trim();
    if (instructions.trim()) extraProperties["Instructions"] = instructions.trim();

    try {
      const response = await fetch("/api/checkout-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: currentVariant.id,
          quantity: effectiveQty,
          selectedOptions,
          extraProperties,
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
              fallbackEmoji={fallbackEmoji}
            />
          </div>

          {/* RIGHT: Configurator */}
          <div className="space-y-6">
            <div>
              {badge && (
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {badge}
                </div>
              )}
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {product.title}
              </h1>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-bold accent-gradient-text">
                  ${variantPrice.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-foreground-muted">
                  per unit
                </span>
              </div>
            </div>

            {notice && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-blue-100">
                {notice}
              </div>
            )}

            {/* Description */}
            {product.descriptionHtml && (
              <ExpandableDescription
                html={product.descriptionHtml}
                className="prose-sm rounded-xl border border-border-soft bg-white/3 px-4 py-3 text-sm leading-relaxed text-foreground-muted [&_a]:text-accent [&_a]:underline"
              />
            )}

            {/* All product options — auto-rendered by type */}
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

            {/* Quantity stepper — only when Shopify doesn't already encode
                quantity tiers as a variant option. */}
            {!hasQuantityOption && (
              <Section
                title={
                  minQuantity > 1
                    ? `Quantity (min ${minQuantity})`
                    : "Quantity"
                }
              >
                <QuantityStepper
                  value={quantity}
                  min={minQuantity}
                  onChange={setQuantity}
                />
              </Section>
            )}

            {/* Design upload(s) — count depends on effective upload mode */}
            {effectiveUploadMode !== "none" && (
              <Section title="Upload your design">
                <div
                  className={`grid gap-3 ${
                    effectiveUploadMode === "front-back"
                      ? "sm:grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {needsFront && (
                    <UploadBox
                      label={
                        effectiveUploadMode === "front-back"
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
            )}

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
            </Section>

            {/* Instructions */}
            <Section title="Notes (optional)">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Any special requests or details we should know…"
                className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                suppressHydrationWarning
              />
            </Section>

            {/* Total */}
            <div className="overflow-hidden rounded-2xl total-gradient p-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-white/90">
                  {hasQuantityOption
                    ? Object.values(selectedOptions).slice(0, 3).join(" / ")
                    : `${effectiveQty} × ${Object.values(selectedOptions).slice(0, 3).join(" / ")}`}
                </span>
                <span className="text-3xl font-bold text-white">
                  ${total.toFixed(2)}
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
                `Minimum ${minQuantity} required`
              ) : !frontReady || !backReady ? (
                <>
                  <span>⬆</span>
                  Upload {needsFront && needsBack ? "both designs" : "design"} to continue
                </>
              ) : (
                <>
                  <span>🛒</span>
                  Add to Cart · ${total.toFixed(2)}
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
