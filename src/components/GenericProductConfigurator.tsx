"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ShopifyMedia, ShopifyProduct } from "@/lib/shopify-products";
import { useCart } from "@/lib/cart-store";
import type { ProductCartItem } from "@/lib/cart-types";
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
import {
  findDimensionOption,
  parseSizeInches,
  selectedSizeInches,
  type SizeUnit,
} from "@/lib/parse-size";
import { BLEED_IN } from "@/lib/template-fit/constants";
import { saveTemplateFitPayload } from "@/lib/template-fit/session";
import BlankTemplateDownload from "@/components/configurator/BlankTemplateDownload";

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
  /** YouTube video ID for a "How to Order" clip shown below the gallery. */
  howToOrderVideoId?: string;
  /**
   * When true/false, force-enables or force-disables the template-fit flow
   * ("Continue" hands uploaded design(s) off to `/products/{handle}/
   * template-fit`, where the customer positions artwork against print
   * bleed/safe guides, instead of adding straight to cart). Leave
   * unset (the default) to auto-detect: enabled whenever the product has a
   * dimensional Size option (e.g. "4x6", "12 x 18") — which is how every
   * product except this one gets the feature, with no per-page wiring.
   * Either way, it falls back to the normal add-to-cart flow if the
   * selected size can't be parsed as a WxH dimension (apparel's S/M/L
   * sizing, quantity-tier "options" like business cards, etc. never match).
   */
  requiresTemplateFit?: boolean;
  /**
   * For products with one fixed real-world print size but no Shopify Size
   * *option* to auto-detect from (e.g. Business Cards is always 2×3.5″ —
   * its only option is a quantity tier, "250Pcs"/"500Pcs"/…). Providing this
   * enables template-fit the same as a dimensional Size option would, just
   * with a constant size instead of one parsed from the customer's
   * selection.
   */
  fixedSizeInches?: { width: number; height: number };
  /**
   * Unit the product's Size option numbers are actually written in.
   * Defaults to "in". Banners' "2 x 1" .. "8 x 4" are feet, same as the
   * printing industry usually quotes them — the digits look identical to
   * inches, so this must be set explicitly per product.
   */
  sizeUnit?: SizeUnit;
  /**
   * Whether the template-fit studio shows bleed/trim guide lines around the
   * design (default true). Set false for products with no bleed step —
   * e.g. Banners are finished at the ordered size (hemmed/grommeted, not
   * die-cut), so there's no bleed or trim margin to show, just the
   * finished-size edge and a safe-area guide.
   */
  showBleedTrim?: boolean;
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

// Print products that are commonly printed on both sides. When the Shopify
// product has no explicit "Print Sides" option of its own, we still let the
// customer choose Front Only vs Front & Back for these.
const DOUBLE_SIDED_KEYWORDS = [
  "business card",
  "flyer",
  "door hanger",
  "brochure",
  "postcard",
  "rack card",
  "hang tag",
  "table tent",
  "greeting card",
  "invitation",
  "leaflet",
  "pamphlet",
];

function isDoubleSidedCapable(title: string, handle: string): boolean {
  const haystack = `${title} ${handle}`
    .toLowerCase()
    .replace(/[-_]+/g, " ");
  return DOUBLE_SIDED_KEYWORDS.some((kw) => haystack.includes(kw));
}

export default function GenericProductConfigurator({
  product,
  badge,
  minQuantity = 1,
  uploadMode = "auto",
  uploadLabel = "Design",
  fallbackEmoji = "📦",
  notice,
  howToOrderVideoId,
  requiresTemplateFit,
  fixedSizeInches,
  sizeUnit = "in",
  showBleedTrim = true,
}: GenericProductConfiguratorProps) {
  const router = useRouter();
  const { addItem } = useCart();
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
  const [printSide, setPrintSide] = useState<"front" | "both">("front");

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

  // Build gallery: variant image first, then product media (images +
  // videos), dedup'd.
  const galleryImages = useMemo<ShopifyMedia[]>(() => {
    const imgs: ShopifyMedia[] = [];
    if (currentVariant?.image) {
      imgs.push({ type: "image", ...currentVariant.image });
    }
    if (
      product.featuredImage &&
      !imgs.some((i) => i.url === product.featuredImage!.url)
    ) {
      imgs.push({ type: "image", ...product.featuredImage });
    }
    for (const m of product.media) {
      if (!imgs.some((i) => i.url === m.url)) imgs.push(m);
    }
    return imgs;
  }, [currentVariant, product.media, product.featuredImage]);

  useEffect(() => {
    setGalleryIdx(0);
  }, [currentVariant?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Resolve effective upload mode. In "auto":
  //  1. If the product has its own Shopify "Print Sides"-type option, follow
  //     the customer's selected value (e.g. Flyers → "Front and Back").
  //  2. Otherwise, if it's a product commonly printed double-sided
  //     (business cards, door hangers, brochures…), show our own built-in
  //     Front Only / Front & Back selector.
  //  3. Otherwise single uploader.
  const sidesOpt =
    uploadMode === "auto" ? findSidesOption(product.options) : undefined;
  const showSideSelector =
    uploadMode === "auto" &&
    !sidesOpt &&
    isDoubleSidedCapable(product.title, product.handle);

  let effectiveUploadMode: "single" | "front-back" | "none";
  if (uploadMode === "auto") {
    if (sidesOpt) {
      effectiveUploadMode = valueIndicatesBothSides(
        selectedOptions[sidesOpt.name],
      )
        ? "front-back"
        : "single";
    } else if (showSideSelector) {
      effectiveUploadMode = printSide === "both" ? "front-back" : "single";
    } else {
      effectiveUploadMode = "single";
    }
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

  function handleAddToCart() {
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
    if (showSideSelector) {
      extraProperties["Print Sides"] =
        printSide === "both" ? "Front & Back" : "Front Only";
    }
    if (phone.trim()) extraProperties["Phone Number"] = phone.trim();
    if (instructions.trim()) extraProperties["Instructions"] = instructions.trim();

    const optsSummary = Object.entries(selectedOptions)
      .map(([, v]) => v)
      .join(" · ");
    const unitPrice = Number(currentVariant.price);

    const cartItem: Omit<ProductCartItem, "id" | "addedAt"> = {
      kind: "product",
      title: product.title,
      subtitle: optsSummary || "Standard",
      thumbnail:
        product.images[0]?.url ?? product.featuredImage?.url ?? fallbackEmoji,
      unitLabel: `$${unitPrice.toFixed(2)} each`,
      totalPrice: unitPrice * effectiveQty,
      quantity: effectiveQty,
      variantId: currentVariant.id,
      productTitle: product.title,
      selectedOptions,
      qty: effectiveQty,
      unitPrice,
      extraProperties,
      editHref: `/products/${product.handle}`,
    };

    addItem(cartItem);
    router.push("/cart");
  }

  const autoTemplateFit = useMemo(
    () => findDimensionOption(product.options) !== undefined || !!fixedSizeInches,
    [product.options, fixedSizeInches],
  );
  const templateFitEnabled = requiresTemplateFit ?? autoTemplateFit;

  const sizeInches = templateFitEnabled
    ? (selectedSizeInches(selectedOptions, sizeUnit) ?? fixedSizeInches ?? null)
    : null;
  const willUseTemplateFit = templateFitEnabled && !!sizeInches;

  function handleContinueToTemplateFit() {
    if (!canCheckout || !currentVariant || !sizeInches) return;

    const extraProperties: Record<string, string> = {};
    if (showSideSelector) {
      extraProperties["Print Sides"] =
        printSide === "both" ? "Front & Back" : "Front Only";
    }
    if (phone.trim()) extraProperties["Phone Number"] = phone.trim();
    if (instructions.trim()) extraProperties["Instructions"] = instructions.trim();

    const unitPrice = Number(currentVariant.price);

    const sides: Record<
      "front" | "back",
      { fileUrl: string; fileName: string | null } | undefined
    > = { front: undefined, back: undefined };
    if (needsFront && frontUpload.fileUrl) {
      sides.front = {
        fileUrl: frontUpload.fileUrl,
        fileName: frontUpload.file?.name ?? null,
      };
    }
    if (needsBack && backUpload.fileUrl) {
      sides.back = {
        fileUrl: backUpload.fileUrl,
        fileName: backUpload.file?.name ?? null,
      };
    }

    const sizeOption = findDimensionOption(product.options);
    const sizeChoices = sizeOption
      ? sizeOption.values.filter((v) => parseSizeInches(v) !== null)
      : [];

    saveTemplateFitPayload({
      productHandle: product.handle,
      productTitle: product.title,
      widthIn: sizeInches.width,
      heightIn: sizeInches.height,
      uploadLabel,
      effectiveUploadMode:
        effectiveUploadMode === "front-back" ? "front-back" : "single",
      sides,
      sizeOptionName: sizeOption?.name ?? null,
      sizeChoices,
      sizeUnit,
      bleedIn: showBleedTrim ? BLEED_IN : 0,
      variants: product.variants.map((v) => ({
        id: v.id,
        price: v.price,
        selectedOptions: Object.fromEntries(
          v.selectedOptions.map((o) => [o.name, o.value]),
        ),
      })),
      cartItem: {
        title: product.title,
        thumbnail:
          product.images[0]?.url ?? product.featuredImage?.url ?? fallbackEmoji,
        unitPrice,
        qty: effectiveQty,
        variantId: currentVariant.id,
        productTitle: product.title,
        selectedOptions,
        extraProperties,
        editHref: `/products/${product.handle}`,
      },
    });

    router.push(`/products/${product.handle}/template-fit`);
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

            {templateFitEnabled && (
              <BlankTemplateDownload
                options={product.options}
                productTitle={product.title}
                fixedSizeInches={fixedSizeInches}
                sizeUnit={sizeUnit}
                bleedIn={showBleedTrim ? BLEED_IN : 0}
              />
            )}

            {howToOrderVideoId && (
              <div className="mt-6">
                <h2 className="font-display text-xl font-black uppercase tracking-tight text-[#d9f000]">
                  How to Order
                </h2>
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-border-soft shadow-lg shadow-black/30">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${howToOrderVideoId}`}
                    title="How to order — Print Laser Stitch"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Configurator */}
          <div className="space-y-6">
            <div>
              {badge && (
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
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
              <div className="rounded-xl border border-[#18d3e8]/30 bg-[#18d3e8]/5 px-4 py-3 text-sm text-[#18d3e8]">
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

            {/* Built-in Print Side selector — only when the product has no
                Shopify sides option but is a double-sided-capable type. */}
            {showSideSelector && (
              <Section title="Print side" value={
                printSide === "both" ? "Front & Back" : "Front Only"
              }>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "front", label: "Front Only" },
                      { key: "both", label: "Front & Back" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setPrintSide(o.key)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        printSide === o.key
                          ? "border-highlight bg-highlight-soft"
                          : "border-border-soft bg-white/3 hover:bg-white/6"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
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
                5-12 business days, for rush orders please contact
                info@printlaserstitch.com
              </div>
            </div>

            <button
              type="button"
              onClick={
                willUseTemplateFit ? handleContinueToTemplateFit : handleAddToCart
              }
              disabled={!canCheckout}
              className={`group flex w-full items-center justify-center gap-2 rounded-md px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider transition ${
                canCheckout
                  ? "accent-gradient text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110"
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
              ) : willUseTemplateFit ? (
                <>
                  Continue
                  <span>→</span>
                </>
              ) : (
                <>
                  <span>🛒</span>
                  Add to Cart · ${total.toFixed(2)}
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-foreground-muted">
              {willUseTemplateFit
                ? "Next, you'll fit your design onto the print template."
                : "You'll be redirected to Shopify checkout."}
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
