"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = selected
    ? items.filter((i) => i.mainCategoryHandle === selected)
    : items;

  // The lightbox only pages through photos (videos play inline)
  const photos = filtered.filter((i) => i.mediaType !== "video");

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setLightbox((cur) =>
        cur === null ? cur : (cur + dir + photos.length) % photos.length,
      ),
    [photos.length],
  );

  // Keyboard + scroll lock while the lightbox is open
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, close, step]);

  const chip = (active: boolean) =>
    `shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
      active
        ? "border-[#d9f000] bg-[#d9f000] text-black shadow-lg shadow-[#d9f000]/20"
        : "border-border-soft bg-white/3 text-foreground/85 hover:bg-white/6"
    }`;

  const current = lightbox !== null ? (photos[lightbox] ?? null) : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 text-center sm:mb-8">
        <span className="inline-block animate-fade-up rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
          Our Work
        </span>
        <h1
          className="mt-3 animate-fade-up font-display text-3xl font-black uppercase tracking-tight sm:text-4xl"
          style={{ animationDelay: "100ms" }}
        >
          Project <span className="accent-gradient-text">Gallery</span>
        </h1>
        <p
          className="mx-auto mt-3 max-w-xl animate-fade-up text-sm text-foreground-muted"
          style={{ animationDelay: "180ms" }}
        >
          Real jobs from our Stuart, FL shop. Tap any photo to see it up close.
        </p>
      </div>

      {categories.length > 0 && (
        <div
          className="-mx-4 mb-6 animate-fade-up px-4 sm:mx-0 sm:mb-8 sm:px-0"
          style={{ animationDelay: "240ms" }}
        >
          <div className="hide-scrollbar flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={chip(selected === null)}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.handle}
                type="button"
                onClick={() => setSelected(c.handle)}
                className={chip(selected === c.handle)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface p-16 text-center text-foreground-muted">
          {items.length === 0
            ? "Our gallery is being updated — check back soon."
            : "No projects in this category yet."}
        </div>
      ) : (
        <div
          key={selected ?? "all"}
          className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3"
        >
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className="group animate-fade-up overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-border-strong hover:shadow-2xl hover:shadow-black/40"
              style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
            >
              <div className="relative aspect-square overflow-hidden bg-background/60">
                {item.mediaType === "video" ? (
                  <video
                    src={item.mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLightbox(photos.indexOf(item))}
                    className="block h-full w-full cursor-zoom-in"
                    aria-label={`View ${item.subCategory ?? item.mainCategoryLabel} larger`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.mediaUrl}
                      alt={item.subCategory ?? item.mainCategoryLabel}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  </button>
                )}
              </div>
              {item.subCategory && (
                <div className="truncate px-3 py-2.5 text-xs font-medium text-foreground/85 sm:px-4 sm:py-3 sm:text-sm">
                  {item.subCategory}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Project photo"
          className="fixed inset-0 z-[60] flex animate-fade-up items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          style={{ animationDuration: "0.3s" }}
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.mediaUrl}
            alt={current.subCategory ?? current.mainCategoryLabel}
            className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {current.subCategory && (
            <div className="absolute inset-x-0 bottom-6 text-center font-headline text-sm text-white/80">
              {current.subCategory}
            </div>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl text-white backdrop-blur transition hover:bg-white/20"
          >
            ✕
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20 sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20 sm:right-4"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
