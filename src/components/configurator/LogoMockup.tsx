"use client";

/**
 * Simple "see your logo on the shirt" preview.
 *
 * The customer's uploaded logo is drawn on top of the main product photo at
 * the left chest. They can drag it to fine-tune the spot and resize it with
 * a slider. Purely visual: nothing here changes the order or the price.
 */

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { isPdfFile, renderPdfFirstPageToFile } from "@/lib/template-fit/pdf-to-image";

/** Logo center and width, as fractions (0–1) of the product photo. */
export type LogoPlacement = { x: number; y: number; width: number };

const DEFAULT_WIDTH = 0.08;
export const MIN_LOGO_WIDTH = 0.04;
export const MAX_LOGO_WIDTH = 0.16;

/** Starting spot for the left chest (the wearer's left = viewer's right).
 * The model photos and the flat product shots frame the polo differently,
 * so a couple of known photos get their own preset. */
export function defaultPlacement(imageUrl: string | undefined): LogoPlacement {
  const name = (imageUrl ?? "").toLowerCase();
  if (name.includes("man_polo_red")) return { x: 0.566, y: 0.33, width: DEFAULT_WIDTH };
  if (name.includes("man_polo")) return { x: 0.59, y: 0.4, width: DEFAULT_WIDTH };
  return { x: 0.585, y: 0.37, width: DEFAULT_WIDTH };
}

/** Turns the uploaded file into something an <img> can show.
 * PNG/JPG/SVG/WEBP/GIF preview directly; a PDF's first page is rendered;
 * AI files can't be previewed in a browser. */
export function useLogoPreviewUrl(file: File | null): {
  url: string | null;
  unsupported: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setUnsupported(false);
    if (!file) return;

    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/") && !name.endsWith(".ai")) {
      objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
    } else if (isPdfFile(file)) {
      renderPdfFirstPageToFile(file)
        .then((png) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(png);
          setUrl(objectUrl);
        })
        .catch(() => !cancelled && setUnsupported(true));
    } else {
      setUnsupported(true);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return { url, unsupported };
}

/** The draggable logo, drawn over the product photo. Place it inside the
 * same box the photo fills (see ProductGallery's `overlay` prop). */
export function LogoOverlay({
  logoUrl,
  placement,
  onChange,
}: {
  logoUrl: string;
  placement: LogoPlacement;
  onChange: (p: LogoPlacement) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function toFraction(e: PointerEvent) {
    const r = boxRef.current!.getBoundingClientRect();
    return { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height };
  }

  function onDown(e: PointerEvent<HTMLImageElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { fx, fy } = toFraction(e);
    drag.current = { dx: fx - placement.x, dy: fy - placement.y };
  }

  function onMove(e: PointerEvent<HTMLImageElement>) {
    if (!drag.current) return;
    const { fx, fy } = toFraction(e);
    const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v));
    onChange({
      ...placement,
      x: clamp(fx - drag.current.dx),
      y: clamp(fy - drag.current.dy),
    });
  }

  function onUp() {
    drag.current = null;
  }

  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="Your logo preview"
        draggable={false}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="pointer-events-auto absolute cursor-grab touch-none select-none object-contain drop-shadow-sm active:cursor-grabbing"
        style={{
          left: `${placement.x * 100}%`,
          top: `${placement.y * 100}%`,
          width: `${placement.width * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

/** Size slider + reset, shown under the photo while a logo is previewed. */
export function LogoMockupControls({
  placement,
  onChange,
  onReset,
}: {
  placement: LogoPlacement;
  onChange: (p: LogoPlacement) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">Your logo preview</span>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-border-soft px-3 py-1 text-xs font-medium hover:bg-white/10"
        >
          Reset to left chest
        </button>
      </div>
      <label className="mt-3 flex items-center gap-3 text-xs text-foreground-muted">
        <span>Smaller</span>
        <input
          type="range"
          min={MIN_LOGO_WIDTH}
          max={MAX_LOGO_WIDTH}
          step={0.005}
          value={placement.width}
          onChange={(e) => onChange({ ...placement, width: Number(e.target.value) })}
          className="flex-1 accent-[#d9f000]"
          aria-label="Logo size"
        />
        <span>Larger</span>
      </label>
      <p className="mt-2 text-xs text-foreground-muted">
        Drag the logo to move it. This preview is just to help you
        visualize — add any size or placement requests in &ldquo;Notes for our printer.&rdquo;
        PNG files with a transparent background look best.
      </p>
    </div>
  );
}
