/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PRINT_LOCATIONS,
  TSHIRT_MIN_QUANTITY,
  type PrintLocationKey,
} from "@/lib/tshirt-pricing";
import type { ShopifyImage, ShopifyProduct } from "@/lib/shopify-products";
import { useCart } from "@/lib/cart-store";
import type { TShirtCartItem, TShirtSizeLine } from "@/lib/cart-types";
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
};

export default function TShirtConfigurator({
  product,
  badge,
  minQuantity: minQuantityProp,
  showPrintLocations = true,
  singleUploadLabel = "Design",
}: ApparelConfiguratorProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const minQuantity = minQuantityProp ?? TSHIRT_MIN_QUANTITY;
  // Separate "Size" out from the other options — Size becomes a per-size
  // quantity matrix instead of a single picker.
  const sizeOption = product.options.find((o) => isSizeOption(o.name));
  const nonSizeOptions = product.options.filter((o) => !isSizeOption(o.name));
  // Colour list — union of two Shopify sources, deduplicated:
  //   1. Shopify Color as a real variant option (per-colour SKUs, per-colour
  //      images, per-colour inventory).
  //   2. Shopify standard taxonomy `shopify.color-pattern` metafield (used
  //      to offer extra colours beyond what variants cover, or as the only
  //      source when the product has already used its 3 variant-option slots).
  // Variant colours come first so the customer's primary picks map to real
  // SKUs. Metafield-only colours fall back to a stand-in variant at the same
  // size with the chosen colour attached as a per-line order property.
  const colorOption =
    nonSizeOptions.find((o) => isColorOption(o.name)) ?? null;
  const colorChoices: readonly string[] = useMemo(() => {
    const variantColors = colorOption?.values ?? [];
    const variantLower = new Set(
      variantColors.map((c) => c.toLowerCase().trim()),
    );
    const extras = product.taxonomyColors
      .map((c) => c.name)
      .filter((n) => !variantLower.has(n.toLowerCase().trim()));
    return [...variantColors, ...extras];
  }, [colorOption, product.taxonomyColors]);
  const multiColor = !!sizeOption && colorChoices.length > 0;
  const pickerOptions = nonSizeOptions.filter((o) => !isColorOption(o.name));

  // Hex lookup for swatches: prefer Shopify-provided hex from the taxonomy
  // metafield (always accurate, even for unusual colour names like
  // "Graphite"); fall back to our static COLOR_HEX map for products whose
  // Color variant doesn't carry a hex code.
  const taxonomyHexMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of product.taxonomyColors) {
      if (c.hex) m.set(c.name.toLowerCase(), c.hex);
    }
    return m;
  }, [product.taxonomyColors]);
  const swatchHex = (name: string) =>
    taxonomyHexMap.get(name.toLowerCase()) ?? colorHex(name) ?? "#888";

  const firstAvailable =
    product.variants.find((v) => v.availableForSale) ?? product.variants[0];

  // Single-pick non-size options (Fabric, Sleeve Type, …). Color is excluded
  // here when it's a multi-color matrix.
  const initialNonSizeOpts: Record<string, string> = useMemo(() => {
    const init: Record<string, string> = {};
    for (const opt of pickerOptions) {
      const fromVariant = firstAvailable?.selectedOptions.find(
        (o) => o.name === opt.name,
      )?.value;
      init[opt.name] = fromVariant ?? opt.values[0];
    }
    return init;
  }, [pickerOptions, firstAvailable]);

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

  // Multi-color matrix: color → (size → qty). `openColors` controls which
  // color blocks are visible (customer adds the colors they want).
  const [openColors, setOpenColors] = useState<string[]>([]);
  const [colorSizeQty, setColorSizeQty] = useState<
    Record<string, Record<string, number>>
  >({});

  const addColor = (color: string) => {
    setOpenColors((prev) => (prev.includes(color) ? prev : [...prev, color]));
    setColorSizeQty((prev) =>
      prev[color]
        ? prev
        : {
            ...prev,
            [color]: Object.fromEntries(
              (sizeOption?.values ?? []).map((s) => [s, 0]),
            ),
          },
    );
  };
  const removeColor = (color: string) => {
    setOpenColors((prev) => prev.filter((c) => c !== color));
    setColorSizeQty((prev) => {
      const next = { ...prev };
      delete next[color];
      return next;
    });
  };
  const setColorSize = (color: string, size: string, n: number) => {
    setColorSizeQty((prev) => ({
      ...prev,
      [color]: { ...(prev[color] ?? {}), [size]: Math.max(0, n) },
    }));
  };

  const [printLocation, setPrintLocation] = useState<PrintLocationKey>("front");
  const [instructions, setInstructions] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const [frontUpload, setFrontUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);
  const [backUpload, setBackUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Find the variant for a given (color, size) and the current single-pick
  // selections (Fabric, …). `color` is null for single-color products.
  //
  // Two-pass lookup:
  //   1. Exact match — color × size × other selections must all line up. Used
  //      for variant colours (real SKUs).
  //   2. Fallback — ignore the Color axis and just match size + other
  //      options. Used for metafield-only colours where no SKU exists yet;
  //      Shopify still needs a variant_id to attach the line to and the
  //      customer's chosen colour is sent as a per-line property.
  function findVariant(color: string | null, sizeName: string) {
    const exact = product.variants.find((v) =>
      v.selectedOptions.every((opt) => {
        if (sizeOption && opt.name === sizeOption.name) {
          return opt.value === sizeName;
        }
        if (colorOption && opt.name === colorOption.name) {
          return color != null && opt.value === color;
        }
        return selectedOptions[opt.name] === opt.value;
      }),
    );
    if (exact) return exact;
    if (!colorOption) return undefined;
    // No SKU for this colour — accept any variant matching just the size and
    // other picker options. (Prefer an available one.)
    const looseMatches = product.variants.filter((v) =>
      v.selectedOptions.every((opt) => {
        if (sizeOption && opt.name === sizeOption.name) {
          return opt.value === sizeName;
        }
        if (opt.name === colorOption.name) return true;
        return selectedOptions[opt.name] === opt.value;
      }),
    );
    return looseMatches.find((v) => v.availableForSale) ?? looseMatches[0];
  }

  // Single-color helper kept for the non-multi-color UI/summary paths.
  function variantForSize(sizeName: string) {
    return findVariant(null, sizeName);
  }

  // In multi-color mode the gallery/price reference follows the first opened
  // color (or the first color value); otherwise it follows the single-pick
  // selection only.
  const referenceColor = multiColor
    ? openColors[0] ?? colorChoices[0] ?? null
    : null;

  const referenceVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) =>
          v.availableForSale &&
          v.selectedOptions.every((opt) => {
            if (sizeOption && opt.name === sizeOption.name) return true;
            if (colorOption && opt.name === colorOption.name) {
              return referenceColor == null || opt.value === referenceColor;
            }
            return selectedOptions[opt.name] === opt.value;
          }),
      ) ?? product.variants[0]
    );
  }, [product.variants, sizeOption, colorOption, referenceColor, selectedOptions]);

  const perShirtPrice = referenceVariant ? Number(referenceVariant.price) : 0;

  // Flattened (color, size, qty, variant) lines for the multi-color matrix.
  const colorLines = useMemo(() => {
    if (!multiColor) return [];
    const lines: Array<{
      color: string;
      size: string;
      qty: number;
      price: number;
    }> = [];
    for (const [color, sizes] of Object.entries(colorSizeQty)) {
      for (const [size, qty] of Object.entries(sizes)) {
        if (qty <= 0) continue;
        const v = findVariant(color, size);
        lines.push({ color, size, qty, price: v ? Number(v.price) : 0 });
      }
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiColor, colorSizeQty, selectedOptions, product.variants]);

  // Total quantity — across all sizes (single) or all color×size (multi).
  const totalQuantity = useMemo(() => {
    if (multiColor) return colorLines.reduce((a, l) => a + l.qty, 0);
    return Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
  }, [multiColor, colorLines, sizeQuantities]);

  // Total price = sum of (qty × variant_price) for every line with qty > 0.
  const totalPrice = useMemo(() => {
    if (multiColor) {
      return colorLines.reduce((a, l) => a + l.price * l.qty, 0);
    }
    let total = 0;
    for (const [size, qty] of Object.entries(sizeQuantities)) {
      if (qty <= 0) continue;
      const v = variantForSize(size);
      if (v) total += Number(v.price) * qty;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiColor, colorLines, sizeQuantities, selectedOptions, product.variants]);

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

  function handleAddToCart() {
    if (!canCheckout) return;

    // Build line items from the qty matrix, with the variant price snapshot
    // we'll display in cart. The server re-fetches live prices at checkout —
    // these client values are display-only.
    const sizeVariants: TShirtSizeLine[] = [];
    if (multiColor) {
      for (const [color, sizes] of Object.entries(colorSizeQty)) {
        for (const [size, qty] of Object.entries(sizes)) {
          if (qty <= 0) continue;
          const v = findVariant(color, size);
          if (!v) {
            setToast(
              `No variant found for ${color} / ${size} with the selected options.`,
            );
            return;
          }
          sizeVariants.push({
            variantId: v.id,
            size,
            quantity: qty,
            unitPrice: Number(v.price),
            color,
          });
        }
      }
    } else {
      for (const [size, qty] of Object.entries(sizeQuantities)) {
        if (qty <= 0) continue;
        const v = variantForSize(size);
        if (!v) {
          setToast(
            `No variant found for ${size} with the selected fabric/sleeve combination.`,
          );
          return;
        }
        sizeVariants.push({
          variantId: v.id,
          size,
          quantity: qty,
          unitPrice: Number(v.price),
        });
      }
    }
    if (sizeVariants.length === 0) {
      setToast("Please enter quantities for at least one size.");
      return;
    }

    setIsCheckingOut(true);
    setToast(null);

    const optsSummary = Object.values(selectedOptions).join(" · ");
    const subtitleParts: string[] = [];
    if (optsSummary) subtitleParts.push(optsSummary);
    if (multiColor) {
      // Group as "Black 2S/3L · Red 4L" so the cart line stays compact.
      const byColor = new Map<string, string[]>();
      for (const sv of sizeVariants) {
        const arr = byColor.get(sv.color!) ?? [];
        arr.push(`${sv.quantity}${sv.size}`);
        byColor.set(sv.color!, arr);
      }
      subtitleParts.push(
        Array.from(byColor.entries())
          .map(([c, parts]) => `${c} ${parts.join("/")}`)
          .join(" · "),
      );
    } else {
      subtitleParts.push(
        sizeVariants.map((sv) => `${sv.quantity} × ${sv.size}`).join(", "),
      );
    }

    const cartItem: Omit<TShirtCartItem, "id" | "addedAt"> = {
      kind: "tshirt",
      title: product.title,
      subtitle: subtitleParts.join(" · "),
      thumbnail:
        referenceVariant?.image?.url ??
        product.featuredImage?.url ??
        product.images[0]?.url ??
        "👕",
      unitLabel: multiColor
        ? `${totalQuantity} pcs · ${
            new Set(sizeVariants.map((sv) => sv.color)).size
          } ${
            new Set(sizeVariants.map((sv) => sv.color)).size === 1
              ? "color"
              : "colors"
          }`
        : `${totalQuantity} pcs · ${sizeVariants.length} ${sizeVariants.length === 1 ? "size" : "sizes"}`,
      totalPrice,
      quantity: totalQuantity,
      productTitle: product.title,
      selectedOptions,
      printLocation: showPrintLocations ? printLocation : undefined,
      uploadLabel: showPrintLocations ? undefined : singleUploadLabel,
      sizeVariants,
      frontFileUrl: frontUpload.fileUrl ?? undefined,
      frontFileName: frontUpload.file?.name,
      backFileUrl: backUpload.fileUrl ?? undefined,
      backFileName: backUpload.file?.name,
      phone: phone.trim() || undefined,
      instructions: instructions || undefined,
      editHref: `/products/${product.handle}`,
    };

    addItem(cartItem);
    router.push("/cart");
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
                <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
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

            {/* Single-pick non-size options (Fabric, Sleeve Type, …). Color,
                when present, is handled by the per-color matrix below. */}
            {pickerOptions.map((opt) => {
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
                        style={{ background: swatchHex(value) }}
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

            {/* Single-color size matrix — qty per size, total ≥ minQuantity */}
            {sizeOption && !multiColor && (
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

            {/* Multi-color matrix — pick colors, set qty per size for each.
                Total across every color must be ≥ minQuantity. */}
            {sizeOption && multiColor && (
              <Section
                title="Colors & quantity"
                value={`${totalQuantity} / min ${minQuantity}`}
                icon={
                  totalQuantity >= minQuantity ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-amber-400">!</span>
                  )
                }
              >
                <p className="mb-2 text-[11px] text-foreground-muted">
                  Add the colors you want — each opens its own size row. You
                  can mix different colors and sizes in one order.
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {colorChoices.map((c) => {
                    const open = openColors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => (open ? removeColor(c) : addColor(c))}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          open
                            ? "border-highlight bg-highlight-soft"
                            : "border-border-soft bg-white/3 hover:bg-white/6"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20"
                          style={{ background: swatchHex(c) }}
                        />
                        {c}
                        <span className="text-foreground-muted">
                          {open ? "✕" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {openColors.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border-soft bg-white/3 px-4 py-6 text-center text-xs text-foreground-muted">
                    Add one or more colors above, then set the quantity per
                    size for each.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {openColors.map((color) => {
                      const colorTotal = Object.values(
                        colorSizeQty[color] ?? {},
                      ).reduce((a, b) => a + b, 0);
                      return (
                        <div
                          key={color}
                          className="overflow-hidden rounded-xl border border-border-soft bg-white/3"
                        >
                          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-full border border-white/20"
                                style={{ background: swatchHex(color) }}
                              />
                              <span className="text-sm font-bold">{color}</span>
                              {colorTotal > 0 && (
                                <span className="text-[11px] text-foreground-muted">
                                  {colorTotal} pcs
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeColor(color)}
                              className="text-[11px] font-medium text-foreground-muted hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-3">
                            {sizeOption.values.map((sz) => {
                              const v = findVariant(color, sz);
                              const soldOut = v && !v.availableForSale;
                              const qty = colorSizeQty[color]?.[sz] ?? 0;
                              return (
                                <div
                                  key={sz}
                                  className={`flex items-center justify-between gap-2 ${
                                    soldOut ? "opacity-50" : ""
                                  }`}
                                >
                                  <span className="text-sm font-semibold text-foreground">
                                    {sz}
                                  </span>
                                  <SizeQtyStepper
                                    value={qty}
                                    disabled={!!soldOut}
                                    onChange={(n) =>
                                      setColorSize(color, sz, n)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalQuantity > 0 && totalQuantity < minQuantity && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    Add {minQuantity - totalQuantity} more to reach the
                    minimum order of {minQuantity}.
                  </p>
                )}
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
                  {multiColor
                    ? colorLines.map((l) => (
                        <div
                          key={`${l.color}-${l.size}`}
                          className="flex items-baseline justify-between gap-2"
                        >
                          <span>
                            {l.qty} × {l.color} {l.size}
                          </span>
                          <span className="font-semibold">
                            ${(l.price * l.qty).toFixed(2)}
                          </span>
                        </div>
                      ))
                    : Object.entries(sizeQuantities)
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
                5-12 business days, for rush orders please contact
                info@printlaserstitch.com
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
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
