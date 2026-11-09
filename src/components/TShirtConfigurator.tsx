/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import MobileBuyBar from "@/components/MobileBuyBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRINT_LOCATIONS,
  TSHIRT_MIN_QUANTITY,
  type PrintLocationKey,
} from "@/lib/tshirt-pricing";
import type { ShopifyMedia, ShopifyProduct } from "@/lib/shopify-products";
import {
  nextVolumeTier,
  volumeDiscountPercent,
  volumeTiersFor,
} from "@/lib/volume-discounts";
import { useCart } from "@/lib/cart-store";
import type { TShirtCartItem, TShirtSizeLine } from "@/lib/cart-types";
import {
  colorHex,
  isColorOption,
  isSizeOption,
} from "@/components/configurator/colors";
import { Section } from "@/components/configurator/Section";
import {
  BulkPricingLadder,
  BulkProgress,
} from "@/components/configurator/BulkPricing";
import { ColorSwatch } from "@/components/configurator/ColorSwatch";
import { ProductGallery } from "@/components/configurator/ProductGallery";
import AnimatedPrice from "@/components/AnimatedPrice";
import MixMatchPanel from "@/components/configurator/MixMatchPanel";
import {
  canAddToMix,
  mixStatus,
  type MixLine,
} from "@/lib/apparel-mix";
import { flyToCart, successFeedback } from "@/lib/interactions";
import { openCartDrawer } from "@/lib/cart-drawer";
import {
  LogoMockupControls,
  LogoOverlay,
  defaultPlacement,
  useLogoPreviewUrl,
  type LogoPlacement,
} from "@/components/configurator/LogoMockup";
import {
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";
import { SizeQtyStepper } from "@/components/configurator/QuantityStepper";
import { ExpandableDescription } from "@/components/configurator/ExpandableDescription";
import { HOW_TO_ORDER_VIDEO_IDS } from "@/lib/how-to-order-videos";
import { DraftNote, useDraft } from "@/components/configurator/useDraft";
import TeeDesigner, {
  packLogo,
  quality,
  renderMockup,
  TeeShowcase,
  tintPhoto,
  unpackLogo,
  uploadBlob,
  zoneFor,
  type DesignerLogos,
  type PhotoKey,
  type Side,
} from "@/components/configurator/TeeDesigner";
import type { ProductCartItem } from "@/lib/cart-types";
import {
  cleanColorMatrix,
  cleanOptions,
  cleanQtyMap,
  cleanStringList,
  cleanText,
  packUpload,
  unpackUpload,
} from "@/lib/draft-storage";

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
  /** Hidden "1 shirt, no minimum" Shopify product. When set, this page also offers a single-shirt option. */
  singleProduct?: ShopifyProduct | null;
};

export default function TShirtConfigurator({
  product,
  badge,
  minQuantity: minQuantityProp,
  showPrintLocations = true,
  singleUploadLabel = "Design",
  singleProduct = null,
}: ApparelConfiguratorProps) {
  const router = useRouter();
  const { addItem, items: cartItems } = useCart();
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
    setActiveColor(color);
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
    setActiveColor((a) => (a === color ? null : a));
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

  const tee = !!singleProduct;
  // Is the visitor a guest? (page is cached, so ask the server from the browser)
  const [guest, setGuest] = useState(false);
  const [vidIdx, setVidIdx] = useState(0);
  useEffect(() => {
    if (!singleProduct) return;
    let live = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => { if (live && r.status === 401) setGuest(true); })
      .catch(() => {});
    return () => { live = false; };
  }, [singleProduct]);
  const [oneMode, setOneMode] = useState(false);
  const [oneSize, setOneSize] = useState("L");
  const [rush, setRush] = useState(false);
  const [proof, setProof] = useState(true);
  const [chest, setChest] = useState(false);
  const [logos, setLogos] = useState<DesignerLogos>({});
  const [teeBusy, setTeeBusy] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [teeErr, setTeeErr] = useState("");

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  // The gallery image is the thing that flies into the cart icon on add.
  const galleryRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Remember an unfinished order — sizes, colors, notes and uploaded artwork
  // — so wandering off to another product doesn't mean starting over.
  const draft = useDraft({
    handle: product.handle,
    snapshot: {
      o: selectedOptions,
      s: sizeQuantities,
      oc: openColors,
      cs: colorSizeQty,
      pl: printLocation,
      i: instructions,
      p: phone,
      fu: packUpload(frontUpload),
      bu: packUpload(backUpload),
      om: oneMode,
      os: oneSize,
      ru: rush,
      pr: proof,
      ch: chest,
      lf: packLogo(logos.front),
      lb: packLogo(logos.back),
    },
    hasContent:
      Object.values(sizeQuantities).some((n) => n > 0) ||
      Object.values(colorSizeQty).some((row) =>
        Object.values(row).some((n) => n > 0),
      ) ||
      !!instructions.trim() ||
      !!phone.trim() ||
      !!frontUpload.fileUrl ||
      !!backUpload.fileUrl ||
      !!packLogo(logos.front) ||
      !!packLogo(logos.back),
    restore: (d) => {
      const sizes = sizeOption?.values ?? [];
      setSelectedOptions((prev) => cleanOptions(d.o, nonSizeOptions, prev));
      setSizeQuantities((prev) => ({ ...prev, ...cleanQtyMap(d.s, sizes) }));
      const colors = cleanStringList(d.oc, colorChoices);
      setOpenColors(colors);
      setColorSizeQty(cleanColorMatrix(d.cs, colors, sizes));
      if (
        showPrintLocations &&
        PRINT_LOCATIONS.some((l) => l.key === d.pl)
      ) {
        setPrintLocation(d.pl as PrintLocationKey);
      }
      setInstructions(cleanText(d.i, 2000));
      setPhone(cleanText(d.p, 40));
      const fu = unpackUpload(d.fu);
      if (fu) setFrontUpload(fu);
      const bu = unpackUpload(d.bu);
      if (bu) setBackUpload(bu);
      if (tee) {
        if (d.om === true) setOneMode(true);
        if (typeof d.os === "string" && ["S", "M", "L", "XL", "2XL"].includes(d.os)) setOneSize(d.os);
        if (typeof d.ru === "boolean") setRush(d.ru);
        if (typeof d.pr === "boolean") setProof(d.pr);
        if (typeof d.ch === "boolean") setChest(d.ch);
        const lf = unpackLogo(d.lf);
        const lb = unpackLogo(d.lb);
        setLogos({ ...(lf ? { front: lf } : {}), ...(lb ? { back: lb } : {}) });
      }
    },
  });

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
  const howToOrderVideoId = HOW_TO_ORDER_VIDEO_IDS[product.handle];

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

  // Automatic volume discount (polos). The server re-applies the same rule
  // at checkout from the real Shopify title — this is just for display.
  const volumeTiers = volumeTiersFor(product.title);
  const volumePct = volumeDiscountPercent(product.title, totalQuantity);
  const volumeSavings = Math.round(totalPrice * volumePct) / 100;
  const bulkFinalPrice = Math.round((totalPrice - volumeSavings) * 100) / 100;
  const STYLE_NAME = selectedOptions["Sleeve Type"] ?? "Cotton Short Sleeve";
  const RUSH_LABEL = "Rush - 2 business days";
  const oneVariant = singleProduct?.variants.find((v) => {
    const o = (n: string) => v.selectedOptions.find((x) => x.name === n)?.value;
    return o("Style") === STYLE_NAME && o("Size") === oneSize && o("Speed") === (rush ? RUSH_LABEL : "Standard");
  });
  const onePrice = Number(oneVariant?.price ?? 0);
  const finalPrice = oneMode ? onePrice : bulkFinalPrice;
  const upcomingTier = nextVolumeTier(product.title, totalQuantity);

  // Build gallery: reference variant image first, then product media, dedup'd.
  const galleryImages = useMemo<ShopifyMedia[]>(() => {
    const imgs: ShopifyMedia[] = [];
    if (referenceVariant?.image) {
      imgs.push({ type: "image", ...referenceVariant.image });
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
  }, [referenceVariant, product.media, product.featuredImage]);

  // "See your logo on the shirt" preview — embroidered apparel / polos,
  // where the logo goes on the left chest. Visual only.
  const mockupEnabled = /\bpolos?\b|embroider/i.test(product.title);
  const { url: logoPreviewUrl, unsupported: logoPreviewUnsupported } =
    useLogoPreviewUrl(mockupEnabled ? frontUpload.file : null);
  // Pick a clean photo of the chosen color for the preview: the photo most of
  // that color's variants use (skips one-off promo graphics). If the color
  // has no photo yet, fall back to the most-used photo of any color.
  const mockupColor =
    referenceColor ?? (colorOption ? selectedOptions[colorOption.name] ?? null : null);
  const mockupPhoto = useMemo(() => {
    const mostUsed = (onlyThisColor: boolean) => {
      const counts = new Map<string, { n: number; url: string; altText: string | null }>();
      for (const v of product.variants) {
        if (!v.image) continue;
        if (
          onlyThisColor &&
          !(colorOption && mockupColor && v.selectedOptions.some(
            (o) => o.name === colorOption.name && o.value === mockupColor,
          ))
        ) continue;
        const prev = counts.get(v.image.url);
        counts.set(v.image.url, {
          n: (prev?.n ?? 0) + 1,
          url: v.image.url,
          altText: v.image.altText,
        });
      }
      let best: { n: number; url: string; altText: string | null } | null = null;
      for (const c of counts.values()) if (!best || c.n > best.n) best = c;
      return best;
    };
    const own = mostUsed(true);
    const photo = own ?? mostUsed(false);
    return photo
      ? {
          media: { type: "image" as const, url: photo.url, altText: photo.altText },
          matchesColor: !!own,
        }
      : null;
  }, [product.variants, colorOption, mockupColor]);
  const displayImages = useMemo<ShopifyMedia[]>(
    () =>
      logoPreviewUrl && mockupPhoto
        ? [mockupPhoto.media, ...galleryImages.filter((i) => i.url !== mockupPhoto.media.url)]
        : galleryImages,
    [logoPreviewUrl, mockupPhoto, galleryImages],
  );
  const mainImageUrl = displayImages[galleryIdx]?.url ?? displayImages[0]?.url;
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>(() =>
    defaultPlacement(mainImageUrl),
  );
  // Each photo frames the shirt differently, so re-center on the chest when
  // the photo changes (keeping the customer's chosen size).
  useEffect(() => {
    setLogoPlacement((p) => ({ ...defaultPlacement(mainImageUrl), width: p.width }));
  }, [mainImageUrl]);
  // Show the selected color's photo as soon as a logo is added.
  useEffect(() => {
    if (logoPreviewUrl) setGalleryIdx(0);
  }, [logoPreviewUrl]);

  // When the reference variant changes (fabric/sleeve), jump to its image.
  useEffect(() => {
    setGalleryIdx(0);
  }, [referenceVariant?.id]);

  useEffect(() => {
    if (tee && new URLSearchParams(window.location.search).get("mode") === "one") setOneMode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Validation: each enabled upload slot needs a successful file. When print
  // locations are hidden, the front slot is the single design and back is
  // unused.
  const teeUploading = !!(logos.front?.uploading || logos.back?.uploading);
  const teeArtOk =
    !!(logos.front || logos.back) &&
    !teeUploading &&
    !logos.front?.error &&
    !logos.back?.error;
  const needsFront =
    tee ||
    !showPrintLocations ||
    printLocation === "front" ||
    printLocation === "both";
  const needsBack =
    !tee &&
    showPrintLocations &&
    (printLocation === "back" || printLocation === "both");
  const frontReady = tee
    ? teeArtOk
    : !needsFront || (!!frontUpload.fileUrl && !frontUpload.isUploading);
  const backReady =
    !needsBack || (!!backUpload.fileUrl && !backUpload.isUploading);
  const anyUploading = tee ? teeUploading : frontUpload.isUploading || backUpload.isUploading;

  // Mix & Match: apparel already in the cart counts toward this order's
  // minimum, so a customer can take 6 polos and 6 tees instead of 12 of
  // either. Checkout recomputes all of this from real Shopify data.
  const cartGarmentLines: MixLine[] = useMemo(
    () =>
      cartItems
        .filter((i) => i.kind === "tshirt")
        .map((i) => ({
          productTitle: i.productTitle,
          quantity: i.sizeVariants.reduce(
            (a, sv) => a + Math.max(0, Math.floor(Number(sv.quantity) || 0)),
            0,
          ),
        })),
    [cartItems],
  );

  const mix = useMemo(
    () =>
      mixStatus([
        ...cartGarmentLines,
        { productTitle: product.title, quantity: totalQuantity },
      ]),
    [cartGarmentLines, product.title, totalQuantity],
  );

  const mixGate = canAddToMix({
    thisStyleQty: totalQuantity,
    productTitle: product.title,
    ownMinimum: minQuantity,
    otherLines: cartGarmentLines,
  });

  const qtyOk = oneMode ? true : mixGate.ok;
  const canCheckout =
    !teeBusy &&
    qtyOk &&
    frontReady &&
    backReady &&
    !anyUploading &&
    !isCheckingOut;

  const teeStyleLong = /long/i.test(STYLE_NAME);
  const teePhoto: PhotoKey = teeStyleLong ? "tee-long" : "tee-short";
  const teeColorHex = (() => {
    if (oneMode) return null;
    const c = activeColor && openColors.includes(activeColor) ? activeColor : openColors[openColors.length - 1];
    if (!c || /^black$/i.test(c)) return null;
    return swatchHex(c);
  })();
  const teeColorName = oneMode
    ? "Black"
    : activeColor && openColors.includes(activeColor)
      ? activeColor
      : (openColors[openColors.length - 1] ?? "Black");

  async function teeMockups(): Promise<Partial<Record<Side, string>>> {
    const out: Partial<Record<Side, string>> = {};
    for (const sd of ["front", "back"] as Side[]) {
      const l = logos[sd];
      if (!l) continue;
      try {
        const base = `/one-shirt/${teePhoto}-${sd}.jpg`;
        const photo = teeColorHex ? await tintPhoto(base, teeColorHex) : base;
        const blob = await renderMockup(photo, sd, teePhoto, zoneFor(teePhoto, sd, chest), l);
        out[sd] = await uploadBlob(blob, `${sd}-mockup.jpg`);
      } catch {
        /* the original file is still attached */
      }
    }
    return out;
  }

  function teePlacement(mocks: Partial<Record<Side, string>>): string[] {
    const lines: string[] = [];
    for (const sd of ["front", "back"] as Side[]) {
      const l = logos[sd];
      if (!l) continue;
      const z = zoneFor(teePhoto, sd, chest);
      const q = quality(l);
      lines.push(
        `${sd === "front" ? "Front" : "Back"}: ${z.label}, ${l.wIn.toFixed(1)}x${(l.wIn * l.ratio).toFixed(1)} in, ` +
          (q.level === "vector" ? "vector" : `${q.dpi} DPI (${q.level})`),
      );
      if (mocks[sd]) lines.push(`${sd === "front" ? "Front" : "Back"} mockup: ${mocks[sd]}`);
    }
    lines.push(proof ? "Proof: send me a proof first" : "Proof: print exactly as shown");
    return lines;
  }

  async function addOne(goCart: boolean) {
    if (!singleProduct || !oneVariant) {
      setTeeErr("That option is not available.");
      return;
    }
    const mocks = await teeMockups();
    const props: Record<string, string> = {};
    if (logos.front?.fileUrl) props["Front design"] = logos.front.fileUrl;
    if (mocks.front) props["Front mockup"] = mocks.front;
    if (logos.back?.fileUrl) props["Back design"] = logos.back.fileUrl;
    if (mocks.back) props["Back mockup"] = mocks.back;
    const place = teePlacement({}).filter((t) => !/mockup/.test(t));
    props["Print placement"] = place.join(" | ");
    props["Shirt color"] = "Black";
    props["Proof"] = proof ? "Send me a proof first" : "No proof - print exactly as shown";
    if (instructions.trim()) props["Notes"] = instructions.trim();
    if (phone.trim()) props["Phone"] = phone.trim();
    const unit = Number(oneVariant.price);
    const item: Omit<ProductCartItem, "id" | "addedAt"> = {
      kind: "product",
      title: "Custom T-Shirt (1 shirt)",
      subtitle: `${STYLE_NAME} · Black · ${oneSize}${rush ? " · Rush" : ""}`,
      thumbnail: mocks.front ?? mocks.back ?? `/one-shirt/${teePhoto}-front.jpg`,
      unitLabel: `$${unit.toFixed(2)} each`,
      totalPrice: unit,
      quantity: 1,
      variantId: oneVariant.id,
      productTitle: singleProduct.title,
      selectedOptions: { Style: STYLE_NAME, Size: oneSize, Speed: rush ? RUSH_LABEL : "Standard" },
      qty: 1,
      unitPrice: unit,
      extraProperties: props,
      editHref: `/products/${product.handle}`,
    };
    addItem(item);
    draft.clear();
    successFeedback();
    if (goCart) {
      router.push("/cart");
    } else {
      flyToCart(galleryRef.current?.querySelector("img") ?? null);
      setTimeout(openCartDrawer, 650);
    }
  }

  async function handleAddToCart(goCart = false) {
    if (!canCheckout) return;
    setTeeErr("");
    if (tee) {
      setTeeBusy(true);
      try {
        if (oneMode) {
          await addOne(goCart);
          return;
        }
        const mocks = await teeMockups();
        return await addBulk(goCart, mocks);
      } catch (e) {
        setTeeErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        return;
      } finally {
        setTeeBusy(false);
      }
    }
    return addBulk(goCart, {});
  }

  function addBulk(goCart: boolean, mocks: Partial<Record<Side, string>>) {

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
      totalPrice: finalPrice,
      quantity: totalQuantity,
      productTitle: product.title,
      selectedOptions,
      printLocation: tee
        ? logos.front && logos.back
          ? "both"
          : logos.back
            ? "back"
            : "front"
        : showPrintLocations
          ? printLocation
          : undefined,
      uploadLabel: showPrintLocations ? undefined : singleUploadLabel,
      sizeVariants,
      frontFileUrl: (tee ? logos.front?.fileUrl : frontUpload.fileUrl) ?? undefined,
      frontFileName: tee ? logos.front?.name : frontUpload.file?.name,
      backFileUrl: (tee ? logos.back?.fileUrl : backUpload.fileUrl) ?? undefined,
      backFileName: tee ? logos.back?.name : backUpload.file?.name,
      phone: phone.trim() || undefined,
      instructions: tee
        ? [instructions.trim(), ...teePlacement(mocks)].filter(Boolean).join("\n") || undefined
        : instructions || undefined,
      editHref: `/products/${product.handle}`,
    };

    addItem(cartItem);
    draft.clear(); // It's in the cart now — nothing left to remember.
    successFeedback();
    flyToCart(galleryRef.current?.querySelector("img") ?? null);
    // Keep them on the product page — the cart comes to them instead.
    setIsCheckingOut(false);
    if (goCart) router.push("/cart");
    else setTimeout(openCartDrawer, 650);
  }

  const checkoutUI = (
    <>
            {oneMode && (
              <div className="overflow-hidden rounded-2xl total-gradient p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-white/90">1 shirt{rush ? " · rush" : ""}</span>
                  <span className="text-3xl font-bold text-white">${onePrice.toFixed(2)}</span>
                </div>
                <div className="mt-1 text-right text-xs font-medium text-white/80">
                  {rush ? "Ready in 2 business days" : "Ready in 3–5 business days"}
                </div>
              </div>
            )}
            {!oneMode && (
              <>
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
              {volumePct > 0 && (
                <div className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold text-white">
                  <span>Volume discount ({volumePct}% off)</span>
                  <span>−${volumeSavings.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-white/90">
                  {totalQuantity} {totalQuantity === 1 ? "shirt" : "shirts"}
                </span>
                <span className="text-3xl font-bold text-white">
                  {volumePct > 0 && (
                    <span className="mr-2 text-base font-medium text-white/60 line-through">
                      ${totalPrice.toFixed(2)}
                    </span>
                  )}
                  ${finalPrice.toFixed(2)}
                </span>
              </div>
              {volumePct > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-black/25 px-3 py-2 text-sm font-bold text-white">
                  <span aria-hidden>🎉</span>
                  You save ${volumeSavings.toFixed(2)} with bulk pricing
                </div>
              )}
              {upcomingTier && totalQuantity > 0 && (
                <div className="mt-2 text-center text-xs font-medium text-white/90">
                  Add {upcomingTier.qtyNeeded} more to get {upcomingTier.percent}% off
                </div>
              )}
              {!tee && <div className="mt-1 text-right text-xs font-medium text-white/80">
                5-12 business days, for rush orders please contact
                info@printlaserstitch.com
              </div>}
            </div>

              </>
            )}

            <button
              id="buy-button"
              type="button"
              onClick={() => void handleAddToCart(false)}
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
                  : (mixGate.reason ??
                    `Add ${minQuantity - totalQuantity} more to reach min ${minQuantity}`)
              ) : !frontReady || !backReady ? (
                <>
                  <span>⬆</span>
                  Upload {needsFront && needsBack ? "both designs" : "design"} to continue
                </>
              ) : (
                <>
                  <span>🛒</span>
                  Add to Cart · ${finalPrice.toFixed(2)}
                </>
              )}
            </button>
            {tee && (
              <button
                type="button"
                onClick={() => void handleAddToCart(true)}
                disabled={!canCheckout}
                className={`flex w-full items-center justify-center gap-2 rounded-md px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider transition ${
                  canCheckout
                    ? "bg-[#18d3e8] text-black hover:brightness-110"
                    : "cursor-not-allowed border border-border-soft bg-white/4 text-foreground-muted"
                }`}
              >
                Buy now
              </button>
            )}
            {teeErr && <p className="text-center text-sm text-[#ff9aa2]">{teeErr}</p>}
            {tee && guest && (
              <div className="rounded-2xl border border-white/10 bg-white/4 p-3 text-center">
                <div className="text-sm font-bold">Already a customer? 👋</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href="/login" className="rounded-full border border-white/25 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">
                    Log in
                  </Link>
                  <Link href="/signup?redirect=/products/cotton-t-shirts" className="rounded-full bg-[#18d3e8] px-3 py-2 text-xs font-bold uppercase tracking-wide text-black">
                    New? Sign up
                  </Link>
                </div>
                <p className="mt-2 text-[11px] text-foreground-muted">Save your design · track orders · reorder fast</p>
              </div>
            )}
            {!tee && <p className="text-center text-[11px] text-foreground-muted">
              You&apos;ll be redirected to Shopify checkout.
            </p>}
    </>
  );

  const hdrUI = (
    <>
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
                {badge ?? `Custom apparel · min ${minQuantity} pcs`}
              </div>
              <h1 className="hidden text-3xl font-bold tracking-tight sm:text-4xl lg:block">
                {product.title}
              </h1>
              {tee && (
                <div className="mt-2 hidden lg:block">
                  <p className="text-base font-medium text-foreground">
                    Custom shirts, made easy. No stress. No 47-step forms. Just pick, upload, done. 😎
                  </p>
                  <TeeTrust />
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <AnimatedPrice
                  value={oneMode ? onePrice : perShirtPrice * (1 - volumePct / 100)}
                  className="text-3xl font-bold accent-gradient-text"
                />
                {!oneMode && volumePct > 0 && (
                  <span className="text-base font-medium text-foreground-muted line-through">
                    ${perShirtPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground-muted">
                  per shirt
                </span>
              </div>
              {!oneMode && volumeTiers.length > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 text-xs font-semibold text-[#d9f000]">
                  <span aria-hidden>🏷️</span>
                  {volumePct > 0
                    ? `Bulk price unlocked — ${volumePct}% off`
                    : `As low as $${(perShirtPrice * (1 - Math.max(...volumeTiers.map((t) => t.percent)) / 100)).toFixed(2)}/shirt in bulk`}
                </div>
              )}
            </div>

    </>
  );

  const optionsUI = (
    <>
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
              if (tee && /sleeve/i.test(opt.name)) {
                return (
                  <Section key={opt.id} title="Pick your shirt" value={value}>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                      {opt.values.map((v) => {
                        const long = /long/i.test(v);
                        const poly = /poly|perf/i.test(v);
                        const label = poly ? "Performance tee" : "Cotton tee";
                        const sub = long ? "Long sleeve" : "Short sleeve";
                        const prices = (oneMode ? singleProduct?.variants : product.variants)
                          ?.filter((x) => x.selectedOptions.some((so) => (so.name === "Sleeve Type" || so.name === "Style") && so.value === v))
                          .map((x) => Number(x.price)) ?? [];
                        const from = prices.length ? Math.min(...prices) : null;
                        return (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={v === value}
                            onClick={() => setOption(opt.name, v)}
                            className={`overflow-hidden rounded-2xl border text-center transition ${
                              v === value ? "border-highlight ring-2 ring-[#18d3e8]/50" : "border-border-soft bg-white/3 hover:bg-white/6"
                            }`}
                          >
                            <div className="bg-white p-1 sm:p-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/one-shirt/${long ? "tee-long" : "tee-short"}-front.jpg`}
                                alt={`${label}, ${sub.toLowerCase()}`}
                                className="mx-auto h-14 w-full object-contain sm:h-24"
                                loading="lazy"
                              />
                            </div>
                            <div className="px-1.5 py-2">
                              <div className="text-[11px] font-bold leading-tight sm:text-xs">{label}</div>
                              <div className="text-[11px] text-foreground-muted">{sub}</div>
                              {from != null && (
                                <div className="mt-0.5 text-xs font-black text-[#d9f000] sm:text-sm">
                                  {oneMode ? "" : "from "}${from.toFixed(from % 1 ? 2 : 0)}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      <Link
                        href="/products/embroidered-polos"
                        className="overflow-hidden rounded-2xl border border-border-soft bg-white/3 text-center transition hover:bg-white/6"
                      >
                        <div className="bg-white p-1 sm:p-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/one-shirt/polo-front.jpg" alt="Embroidered polo" className="mx-auto h-14 w-full object-contain sm:h-24" loading="lazy" />
                        </div>
                        <div className="px-1.5 py-2">
                          <div className="text-xs font-bold leading-tight">Polo</div>
                          <div className="text-[11px] font-black uppercase tracking-wide text-[#d94cb3]">Embroidery</div>
                          <div className="mt-0.5 text-[11px] font-bold text-[#18d3e8]">See polos →</div>
                        </div>
                      </Link>
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


    </>
  );

  const toggleUI = (
    <>
            {/* Bulk pricing tiers — right above the quantities, so customers
                see the per-shirt price drop as they add more. */}
            {tee && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { one: false, t: "12 or more 💰", sub: "Save up to 20%" },
                  { one: true, t: "Try 1 shirt 🔥", sub: "Black only" },
                ].map((o) => (
                  <button
                    key={o.t}
                    type="button"
                    aria-pressed={oneMode === o.one}
                    onClick={() => setOneMode(o.one)}
                    className={`rounded-2xl border p-3 text-center transition ${
                      oneMode === o.one
                        ? "border-highlight bg-highlight-soft ring-2 ring-[#18d3e8]/40"
                        : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <div className="font-display text-lg font-black uppercase">{o.t}</div>
                    <div className="text-[11px] text-foreground-muted">{o.sub}</div>
                  </button>
                ))}
              </div>
            )}


    </>
  );

  const matricesUI = (
    <>
            {tee && oneMode && (
              <>
                <Section title="Color" value="Black">
                  <p className="rounded-xl border border-border-soft bg-white/3 px-4 py-2.5 text-sm font-bold">⚫ Black</p>
                </Section>
                <Section title="Size" value={oneSize}>
                  <div className="grid grid-cols-5 gap-2">
                    {["S", "M", "L", "XL", "2XL"].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setOneSize(z)}
                        className={`rounded-xl border px-1 py-2.5 text-sm font-bold transition ${
                          oneSize === z ? "border-highlight bg-highlight-soft" : "border-border-soft bg-white/3 hover:bg-white/6"
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                  {oneSize === "2XL" && <p className="mt-1 text-[11px] text-foreground-muted">2XL is +$4.</p>}
                </Section>
                <Section title="Speed">
                  <button
                    type="button"
                    aria-pressed={rush}
                    onClick={() => setRush(!rush)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      rush ? "border-highlight bg-highlight-soft" : "border-border-soft bg-white/3"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] ${rush ? "border-[#18d3e8] bg-[#18d3e8] text-black" : "border-white/40"}`}>
                      {rush ? "✓" : ""}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">Rush: 2 business days <span className="font-normal text-[#d9f000]">· +$15</span></span>
                    </span>
                  </button>
                </Section>
              </>
            )}


            {/* Single-color size matrix — qty per size, total ≥ minQuantity */}
            {!oneMode && sizeOption && !multiColor && (
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
                {totalQuantity > 0 &&
                  totalQuantity < minQuantity &&
                  !mix.qualifies && (
                    <p className="mt-2 text-[11px] text-amber-300">
                      Add {minQuantity - totalQuantity} more to reach the
                      minimum order of {minQuantity}.
                    </p>
                  )}
                {volumeTiers.length > 0 && cartGarmentLines.length === 0 && (
                  <BulkProgress
                    tiers={volumeTiers}
                    totalQuantity={totalQuantity}
                    subtotal={totalPrice}
                    unitPrice={perShirtPrice}
                  />
                )}
              </Section>
            )}

            {/* Multi-color matrix — pick colors, set qty per size for each.
                Total across every color must be ≥ minQuantity. */}
            {!oneMode && sizeOption && multiColor && (
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
                  <p className="rounded-xl border border-dashed border-border-soft bg-white/3 px-4 py-5 text-center text-xs text-foreground-muted">
                    Tap a color to start 👆
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

                {totalQuantity > 0 &&
                  totalQuantity < minQuantity &&
                  !mix.qualifies && (
                    <p className="mt-2 text-[11px] text-amber-300">
                      Add {minQuantity - totalQuantity} more to reach the
                      minimum order of {minQuantity}.
                    </p>
                  )}
                {volumeTiers.length > 0 && cartGarmentLines.length === 0 && (
                  <BulkProgress
                    tiers={volumeTiers}
                    totalQuantity={totalQuantity}
                    subtotal={totalPrice}
                    unitPrice={perShirtPrice}
                  />
                )}
              </Section>
            )}


    </>
  );

  const ladderUI = (
    <>
            {!oneMode && sizeOption && volumeTiers.length > 0 && (
              <BulkPricingLadder
                tiers={volumeTiers}
                minQuantity={minQuantity}
                unitPrice={perShirtPrice}
                totalQuantity={totalQuantity}
                compact={tee}
              />
            )}


    </>
  );

  const mixUI = (
    <>
            {/* Mix & Match — apparel already in the cart counts toward this
                order's minimum and its bulk tier. */}
            {!oneMode && (
            <MixMatchPanel
              status={mix}
              thisStyleQty={totalQuantity}
              productTitle={product.title}
              ownMinimum={minQuantity}
              cartLines={cartGarmentLines}
            />
            )}


    </>
  );

  const designUI = (
    <>
                <div>
                  <TeeDesigner
                    photoKey={teePhoto}
                    colorHex={teeColorHex}
                    chest={chest}
                    setChest={setChest}
                    logos={logos}
                    setLogos={(fn) => setLogos(fn)}
                  />
                </div>

    </>
  );

  const proofUI = (
    <>
                <Section title="Proof">
                  <div className="space-y-2">
                    {[
                      { v: true, t: "Send me a proof", d: "Free. Nothing prints until you say OK." },
                      { v: false, t: "No proof. Print it as shown.", d: "Fastest. Prints exactly like your picture." },
                    ].map((o) => (
                      <button
                        key={o.t}
                        type="button"
                        aria-pressed={proof === o.v}
                        onClick={() => setProof(o.v)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                          proof === o.v ? "border-highlight bg-highlight-soft" : "border-border-soft bg-white/3"
                        }`}
                      >
                        <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${proof === o.v ? "border-[#18d3e8] bg-[#18d3e8]" : "border-white/40"}`} />
                        <span>
                          <span className="block text-sm font-bold">{o.t}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>

    </>
  );

  const phoneUI = (
    <>
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
              <p className="mt-1.5 hidden text-[11px] text-foreground-muted">
                Optional — we&apos;ll text you if there&apos;s something to
                confirm about the artwork.
              </p>
            </Section>


    </>
  );

  const notesUI = (
    <>
            {/* Instructions */}
            <Section title="Notes for our printer (optional)">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder={tee ? "Anything we should know?" : "Any special requests — e.g. 'Center logo on chest', 'Use a 3-inch print width'…"}
                className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 outline-none ring-highlight/40 focus:ring-2"
                suppressHydrationWarning
              />
            </Section>


    </>
  );

  const teeTitle = product.title.replace(/\s*\([^)]*\)\s*$/, "");
  const teeVideos = displayImages.filter((m) => m.type === "video");
  const teeLayout = (
    <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 lg:px-8">
      {draft.restored && <DraftNote onStartOver={draft.startOver} />}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
        {/* Title bar: one slim line over everything */}
        <div className="flex items-baseline justify-between gap-3 lg:col-span-3">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">{teeTitle}</h1>
          <div className="flex items-baseline gap-2">
            <AnimatedPrice
              value={oneMode ? onePrice : perShirtPrice * (1 - volumePct / 100)}
              className="text-2xl font-bold accent-gradient-text"
            />
            {!oneMode && volumePct > 0 && (
              <span className="text-sm font-medium text-foreground-muted line-through">${perShirtPrice.toFixed(2)}</span>
            )}
            <span className="text-xs font-medium text-foreground-muted">per shirt</span>
          </div>
        </div>

        {/* Column 1: quantity, shirt, colors */}
        <div id="order-options" className="scroll-mt-32 max-lg:contents lg:space-y-3">
          <div className="max-lg:order-2">{toggleUI}</div>
          <div className="max-lg:order-3">{optionsUI}</div>
          <div className="space-y-3 max-lg:order-4">{matricesUI}</div>
          <div className="max-lg:order-6">{mixUI}</div>
        </div>

        {/* Column 2: the shirt + design */}
        <div ref={galleryRef} className="max-lg:contents lg:space-y-3">
          <div className="sticky top-[58px] z-30 -mx-4 bg-background/95 px-4 py-2 backdrop-blur max-lg:order-1 max-lg:[&_svg]:mx-auto max-lg:[&_svg]:h-[20vh] max-lg:[&_svg]:w-auto lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <TeeShowcase
              photoKey={teePhoto}
              colorHex={teeColorHex}
              chest={chest}
              logos={logos}
              label={`${teeColorName} · ${STYLE_NAME}`}
            />
          </div>
          <div className="max-lg:order-7">{designUI}</div>
          {teeVideos.length > 0 && (
            <div className="max-lg:order-10">
              <h2 className="mb-2 font-display text-sm font-black uppercase tracking-tight text-[#d9f000]">See how we make it 🎬</h2>
              <ProductGallery images={teeVideos} idx={vidIdx} setIdx={setVidIdx} title={product.title} />
            </div>
          )}
        </div>

        {/* Column 3: savings, proof, phone, then pay */}
        <div className="max-lg:contents lg:space-y-3">
          <div className="max-lg:order-5">{ladderUI}</div>
          <div className="space-y-3 max-lg:order-8">
            {proofUI}
            {phoneUI}
            {notesUI}
          </div>
          <div className="space-y-3 max-lg:order-9">{checkoutUI}</div>
        </div>

        {/* Bottom: all the words live here */}
        <div className="mt-2 grid gap-5 border-t border-border-soft pt-5 max-lg:order-[11] lg:col-span-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {howToOrderVideoId && (
            <div>
              <h2 className="font-display text-sm font-black uppercase tracking-tight text-[#d9f000]">How to order</h2>
              <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-border-soft">
                <iframe
                  loading="lazy"
                  src={`https://www.youtube-nocookie.com/embed/${howToOrderVideoId}`}
                  title="How to order — Print Laser Stitch"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          <div className="space-y-3 text-sm text-foreground-muted">
            <TeeTrust />
            <ul className="space-y-1 text-xs">
              <li>✔ Proof is free. Nothing prints until you say OK.</li>
              <li>✔ 12+ shirts ready in 5–12 business days. Rush? Email info@printlaserstitch.com.</li>
              <li>✔ Your design is saved on this device for 30 days.</li>
              <li>✔ You&apos;ll finish checkout on Shopify.</li>
            </ul>
            {product.descriptionHtml && (
              <ExpandableDescription
                html={product.descriptionHtml}
                className="prose-sm rounded-xl border border-border-soft bg-white/3 px-4 py-3 text-sm leading-relaxed text-foreground-muted [&_a]:text-accent [&_a]:underline"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

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

      {tee ? teeLayout : (
      <div className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 ${tee ? "max-w-[1500px]" : "max-w-7xl"}`}>
        <div className={tee ? "flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8" : "grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:gap-12"}>
          {/* LEFT: Sticky gallery */}
          <div ref={galleryRef} className={tee ? "max-lg:contents lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1" : "lg:sticky lg:top-20 lg:self-start"}>
            {/* Phones: say what this is first, with a clear next step */}
            <div className="mb-4 lg:hidden">
              <h1 className="font-display text-2xl font-black uppercase leading-tight tracking-tight">
                {product.title.replace(/\s*\([^)]*\)\s*$/, "")}
              </h1>
              <p className="mt-1.5 text-sm text-foreground-muted">
                {tee ? "Custom shirts, made easy. No stress. No 47-step forms. Just pick, upload, done. 😎" : <>{product.title.match(/\(([^)]*)\)\s*$/)?.[1]}{product.title.match(/\(([^)]*)\)\s*$/) ? ". " : ""}Choose your options below and order online in minutes.</>}
              </p>
              {tee && <TeeTrust />}
              <a
                href="#order-options"
                className="mt-3 inline-flex items-center gap-2 rounded-full accent-gradient px-5 py-2.5 font-headline text-sm font-bold uppercase tracking-wide text-black shadow-lg shadow-[#d9f000]/25 transition active:scale-95"
              >
                Choose your options
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </a>
            </div>
            {!tee && <ProductGallery
              images={displayImages}
              idx={galleryIdx}
              setIdx={setGalleryIdx}
              title={product.title}
              overlay={
                logoPreviewUrl ? (
                  <LogoOverlay
                    logoUrl={logoPreviewUrl}
                    placement={logoPlacement}
                    onChange={setLogoPlacement}
                  />
                ) : undefined
              }
            />}

            {logoPreviewUrl && mockupPhoto && !mockupPhoto.matchesColor && mockupColor && (
              <p className="mt-3 text-xs text-foreground-muted">
                We don&apos;t have a {mockupColor} photo yet, so your logo is
                shown on another color. Your polos will be {mockupColor}.
              </p>
            )}
            {logoPreviewUrl && (
              <div className="mt-3">
                <LogoMockupControls
                  placement={logoPlacement}
                  onChange={setLogoPlacement}
                  onReset={() =>
                    setLogoPlacement((p) => ({
                      ...defaultPlacement(mainImageUrl),
                      width: p.width,
                    }))
                  }
                />
              </div>
            )}
            {logoPreviewUnsupported && (
              <p className="mt-3 rounded-2xl border border-border-soft bg-surface p-4 text-xs text-foreground-muted">
                Your file is uploaded and ready for production. The on-shirt
                preview works with PNG, JPG, SVG or PDF files.
              </p>
            )}

            {howToOrderVideoId && !tee && (
              <div className="mt-6 hidden lg:block">
                <h2 className="font-display text-xl font-black uppercase tracking-tight text-[#d9f000]">
                  How to Order
                </h2>
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-border-soft shadow-lg shadow-black/30">
                  <iframe
                    loading="lazy"
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
          <div id="order-options" className={tee ? "scroll-mt-32 space-y-6 max-lg:order-2 lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0" : "scroll-mt-32 space-y-6"}>
            <div className="space-y-6">
            {draft.restored && <DraftNote onStartOver={draft.startOver} />}
            {hdrUI}

            {optionsUI}
            {toggleUI}
            {matricesUI}
            {ladderUI}
            {mixUI}
            </div>
            <div className="space-y-6">
            {tee ? (
              <>
            {designUI}
            {proofUI}
              </>
            ) : (
              <>
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

              </>
            )}

            {phoneUI}
            {notesUI}
            {!tee && checkoutUI}
            {/* Description */}
            {!tee && product.descriptionHtml && (
              <ExpandableDescription
                html={product.descriptionHtml}
                className="prose-sm rounded-xl border border-border-soft bg-white/3 px-4 py-3 text-sm leading-relaxed text-foreground-muted [&_a]:text-accent [&_a]:underline"
              />
            )}



            </div>
          </div>

          {/* How-to video: below the product on phones */}
          {howToOrderVideoId && (
            <div className={tee ? "mt-6 max-lg:order-6 lg:col-span-3" : "lg:hidden"}>
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-[#d9f000]">
                How to Order
              </h2>
              <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-border-soft shadow-lg shadow-black/30">
                <iframe
                  loading="lazy"
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
      </div>
      )}

      <MobileBuyBar
        total={finalPrice}
        targetId="buy-button"
        label="Review order"
        note={
          volumePct > 0
            ? `Saving ${volumePct}% · $${volumeSavings.toFixed(2)}`
            : upcomingTier && totalQuantity > 0
              ? `+${upcomingTier.qtyNeeded} more = ${upcomingTier.percent}% off`
              : undefined
        }
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border-strong bg-surface-elevated px-5 py-3 text-sm shadow-2xl shadow-black/40">
          {toast}
        </div>
      )}
    </section>
  );
}

/** Playful trust line under the title. */
function TeeTrust() {
  return (
    <div className="mt-2 space-y-1 text-sm text-foreground-muted">
      <p>
        <span className="font-bold text-foreground">🇺🇸 Made in the USA</span> · printed in-house, right here in Rio, FL.
      </p>
      <p>Want to watch your shirt get made? Pop into the shop! ❤️ Handmade with love, every order.</p>
    </div>
  );
}
