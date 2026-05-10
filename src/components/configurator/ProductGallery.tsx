"use client";

import Image from "next/image";
import type { ShopifyImage } from "@/lib/shopify-products";

export function ProductGallery({
  images,
  idx,
  setIdx,
  title,
  fallbackEmoji = "📦",
}: {
  images: ShopifyImage[];
  idx: number;
  setIdx: (i: number) => void;
  title: string;
  fallbackEmoji?: string;
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
            {fallbackEmoji}
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
