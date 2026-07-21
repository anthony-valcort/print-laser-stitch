"use client";

import { useMemo, useState } from "react";
import type { GalleryItem } from "@/lib/gallery-shopify";

export default function GalleryPageClient({ items }: { items: GalleryItem[] }) {
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.mainCategoryHandle)) {
        seen.set(item.mainCategoryHandle, item.mainCategoryLabel);
      }
    }
    return Array.from(seen, ([handle, label]) => ({ handle, label }));
  }, [items]);

  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected
    ? items.filter((i) => i.mainCategoryHandle === selected)
    : items;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <span className="inline-block rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
          Our Work
        </span>
        <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Project <span className="accent-gradient-text">Gallery</span>
        </h1>
      </div>

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              selected === null
                ? "border-highlight bg-highlight-soft"
                : "border-border-soft bg-white/3 hover:bg-white/6"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.handle}
              type="button"
              onClick={() => setSelected(c.handle)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selected === c.handle
                  ? "border-highlight bg-highlight-soft"
                  : "border-border-soft bg-white/3 hover:bg-white/6"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface p-16 text-center text-foreground-muted">
          {items.length === 0
            ? "Our gallery is being updated — check back soon."
            : "No projects in this category yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:border-border-strong"
            >
              <div className="relative aspect-square bg-background/60">
                {item.mediaType === "video" ? (
                  <video
                    src={item.mediaUrl}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.mediaUrl}
                    alt={item.subCategory ?? item.mainCategoryLabel}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              {item.subCategory && (
                <div className="px-4 py-3 text-sm font-medium text-foreground/85">
                  {item.subCategory}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
