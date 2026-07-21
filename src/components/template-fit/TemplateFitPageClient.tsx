"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TemplateFitStudio, { type Side } from "./TemplateFitStudio";
import {
  clearTemplateFitPayload,
  readTemplateFitPayload,
  type TemplateFitPayload,
} from "@/lib/template-fit/session";
import { uploadFlattenedDesign } from "@/lib/template-fit/upload-flattened";
import { parseSizeInchesWithUnit } from "@/lib/parse-size";
import { useCart } from "@/lib/cart-store";
import type { ProductCartItem } from "@/lib/cart-types";

export default function TemplateFitPageClient({
  productHandle,
}: {
  productHandle: string;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [payload, setPayload] = useState<TemplateFitPayload | null | undefined>(
    undefined,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size can be changed on this page — these start from the payload but can
  // diverge if the customer picks a different size before finalizing.
  const [widthIn, setWidthIn] = useState(0);
  const [heightIn, setHeightIn] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [variantId, setVariantId] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);

  useEffect(() => {
    const p = readTemplateFitPayload();
    // Guards against stale sessionStorage from a different product (e.g. two
    // tabs, or navigating here directly without going through "Continue").
    if (!p || p.productHandle !== productHandle) {
      router.replace(`/products/${productHandle}`);
      return;
    }
    setPayload(p);
    setWidthIn(p.widthIn);
    setHeightIn(p.heightIn);
    setSelectedOptions(p.cartItem.selectedOptions);
    setVariantId(p.cartItem.variantId);
    setUnitPrice(p.cartItem.unitPrice);
  }, [router, productHandle]);

  const subtitle = useMemo(
    () => Object.values(selectedOptions).join(" · ") || "Standard",
    [selectedOptions],
  );

  function handleSizeChange(newValue: string) {
    if (!payload?.sizeOptionName) return;
    const dims = parseSizeInchesWithUnit(newValue, payload.sizeUnit);
    if (!dims) return;
    const newSelected = { ...selectedOptions, [payload.sizeOptionName]: newValue };
    const variant = payload.variants.find((v) =>
      Object.entries(newSelected).every(([k, val]) => v.selectedOptions[k] === val),
    );
    if (!variant) return; // no matching variant for this combination — ignore
    setSelectedOptions(newSelected);
    setVariantId(variant.id);
    setUnitPrice(Number(variant.price));
    setWidthIn(dims.width);
    setHeightIn(dims.height);
  }

  async function handleFinalize(blobs: Partial<Record<Side, Blob>>) {
    if (!payload) return;
    setError(null);
    setUploading(true);
    try {
      const extraProperties = { ...payload.cartItem.extraProperties };

      if (payload.effectiveUploadMode === "front-back") {
        if (blobs.front) {
          const url = await uploadFlattenedDesign(
            blobs.front,
            payload.sides.front?.fileName ?? "front-design.png",
          );
          extraProperties["Front Design"] = url;
          if (payload.sides.front?.fileName) {
            extraProperties["Front Design Filename"] = payload.sides.front.fileName;
          }
        }
        if (blobs.back) {
          const url = await uploadFlattenedDesign(
            blobs.back,
            payload.sides.back?.fileName ?? "back-design.png",
          );
          extraProperties["Back Design"] = url;
          if (payload.sides.back?.fileName) {
            extraProperties["Back Design Filename"] = payload.sides.back.fileName;
          }
        }
      } else if (blobs.front) {
        const url = await uploadFlattenedDesign(
          blobs.front,
          payload.sides.front?.fileName ?? "design.png",
        );
        extraProperties[`${payload.uploadLabel} File`] = url;
        if (payload.sides.front?.fileName) {
          extraProperties[`${payload.uploadLabel} Filename`] =
            payload.sides.front.fileName;
        }
      }

      const cartItem: Omit<ProductCartItem, "id" | "addedAt"> = {
        kind: "product",
        title: payload.cartItem.title,
        subtitle,
        thumbnail: payload.cartItem.thumbnail,
        unitLabel: `$${unitPrice.toFixed(2)} each`,
        totalPrice: unitPrice * payload.cartItem.qty,
        quantity: payload.cartItem.qty,
        variantId,
        productTitle: payload.cartItem.productTitle,
        selectedOptions,
        qty: payload.cartItem.qty,
        unitPrice,
        extraProperties,
        editHref: payload.cartItem.editHref,
      };

      addItem(cartItem);
      clearTemplateFitPayload();
      router.push("/cart");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload your design. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (payload === undefined) {
    return (
      <div className="py-20 text-center text-sm text-foreground-muted">
        Loading…
      </div>
    );
  }

  if (!payload) return null; // redirecting

  const showSizePicker = !!payload.sizeOptionName && payload.sizeChoices.length > 1;
  const currentSizeValue = payload.sizeOptionName
    ? selectedOptions[payload.sizeOptionName]
    : undefined;

  return (
    <>
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Step 2 of 2
        </p>
        <h1 className="mt-2 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
          Fit Your Design
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Position your artwork inside the print guides for {widthIn}&quot; ×{" "}
          {heightIn}&quot;.
        </p>
      </div>

      {showSizePicker && (
        <div className="mx-auto mb-6 flex max-w-md items-center justify-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Size
          </label>
          <select
            value={currentSizeValue}
            onChange={(e) => handleSizeChange(e.target.value)}
            className="rounded-xl border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {payload.sizeChoices.map((v) => (
              <option key={v} value={v} style={{ backgroundColor: "#1e1e1e", color: "#f5f5f5" }}>
                {v}
              </option>
            ))}
          </select>
          <span className="text-sm font-semibold text-foreground">
            ${unitPrice.toFixed(2)}
          </span>
        </div>
      )}

      <TemplateFitStudio
        widthIn={widthIn}
        heightIn={heightIn}
        sides={payload.sides}
        busy={uploading}
        error={error}
        onFinalize={handleFinalize}
        bleedIn={payload.bleedIn}
      />
    </>
  );
}
