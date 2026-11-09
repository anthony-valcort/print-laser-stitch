"use client";

import { useCallback, useEffect, useState } from "react";

type Img = { url: string; alt: string; width: number; height: number };

export default function StoryGallery({ images, title }: { images: Img[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 [&>li]:mb-3">
        {images.map((im, i) => (
          <li key={im.url} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Enlarge photo ${i + 1} of ${images.length}`}
              className="block w-full overflow-hidden rounded-xl border border-border-soft outline-none transition hover:-translate-y-0.5 hover:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={im.url}
                alt={im.alt || `${title} photo ${i + 1}`}
                width={im.width}
                height={im.height}
                loading="lazy"
                className="h-auto w-full"
              />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3"
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[open].url}
            alt={images[open].alt || title}
            className="max-h-[88vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 h-11 w-11 rounded-full bg-white/15 text-xl hover:bg-white/25"
          >
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-xl hover:bg-white/25"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/15 text-xl hover:bg-white/25"
              >
                →
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
