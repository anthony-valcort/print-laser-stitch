/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { shrinkToUploadLimit } from "@/lib/shrink-image";

export type Side = "front" | "back";
export type PhotoKey = "tee-short" | "tee-long";
export type Zone = { x: number; y: number; w: number; h: number; inW: number; inH: number; label: string };

export type Logo = {
  url: string; // what we show (blob while fresh, CDN link after restore)
  fileUrl?: string; // uploaded copy (set once the upload finishes)
  name: string;
  ratio: number; // height / width
  pxW: number;
  vector: boolean;
  nx: number; // center inside the print box, 0..1
  ny: number;
  wIn: number; // printed width in inches
  uploading?: boolean;
  error?: string;
};

export const IMG: Record<PhotoKey, Record<Side, { w: number; h: number }>> = {
  "tee-short": { front: { w: 690, h: 883 }, back: { w: 678, h: 883 } },
  "tee-long": { front: { w: 752, h: 916 }, back: { w: 745, h: 917 } },
};
export const ZONE: Record<PhotoKey, { full: Zone; chest: Zone; back: Zone }> = {
  "tee-short": {
    full: { x: 234, y: 165, w: 237, h: 276, inW: 12, inH: 14, label: "Full front" },
    chest: { x: 395, y: 175, w: 99, h: 99, inW: 5, inH: 5, label: "Left chest" },
    back: { x: 218, y: 105, w: 237, h: 276, inW: 12, inH: 14, label: "Full back" },
  },
  "tee-long": {
    full: { x: 260, y: 150, w: 240, h: 280, inW: 12, inH: 14, label: "Full front" },
    chest: { x: 440, y: 170, w: 100, h: 100, inW: 5, inH: 5, label: "Left chest" },
    back: { x: 248, y: 120, w: 240, h: 280, inW: 12, inH: 14, label: "Full back" },
  },
};

export function zoneFor(photo: PhotoKey, side: Side, chest: boolean): Zone {
  return side === "back" ? ZONE[photo].back : chest ? ZONE[photo].chest : ZONE[photo].full;
}

function cropBox(z: Zone, dim: { w: number; h: number }) {
  const vw = Math.min(dim.w, Math.max(z.w * 1.9, 260));
  const vh = Math.min(dim.h, Math.max(z.h * 1.6, vw * 1.1));
  const x = Math.min(dim.w - vw, Math.max(0, z.x + z.w / 2 - vw / 2));
  const y = Math.min(dim.h - vh, Math.max(0, z.y - (vh - z.h) * 0.3));
  return { x, y, w: vw, h: vh };
}

export function quality(l: Logo): { dpi: number; level: "great" | "good" | "low" | "vector" } {
  if (l.vector) return { dpi: 0, level: "vector" };
  const dpi = Math.round(l.pxW / l.wIn);
  return { dpi, level: dpi >= 300 ? "great" : dpi >= 200 ? "good" : "low" };
}

function loadImg(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    if (cors) im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("img"));
    im.src = src;
  });
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Paints the (black) sample shirt photo in another color, keeping folds and shadows. */
export async function tintPhoto(src: string, hex: string): Promise<string> {
  const rgb = hexToRgb(hex);
  const im = await loadImg(src);
  if (!rgb) return src;
  const c = document.createElement("canvas");
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const ctx = c.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const L = (p[i] + p[i + 1] + p[i + 2]) / 3;
    const a = Math.min(1, Math.max(0, (248 - L) / 30));
    const k = Math.min(1, Math.max(0, (L - 6) / 60));
    const shade = 0.55 + 0.45 * k;
    p[i] = 255 * (1 - a) + rgb[0] * shade * a;
    p[i + 1] = 255 * (1 - a) + rgb[1] * shade * a;
    p[i + 2] = 255 * (1 - a) + rgb[2] * shade * a;
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL("image/jpeg", 0.9);
}

export function useTintedPhoto(src: string, hex: string | null): string {
  const [out, setOut] = useState(src);
  useEffect(() => {
    let dead = false;
    if (!hex || /^#0{3,6}$/i.test(hex) || hex.toLowerCase() === "#111111") {
      setOut(src);
      return;
    }
    tintPhoto(src, hex)
      .then((u) => { if (!dead) setOut(u); })
      .catch(() => { if (!dead) setOut(src); });
    return () => { dead = true; };
  }, [src, hex]);
  return out;
}

export async function renderMockup(photo: string, side: Side, photoKey: PhotoKey, zone: Zone, l: Logo): Promise<Blob> {
  const dim = IMG[photoKey][side];
  const [bg, lg] = await Promise.all([loadImg(photo), loadImg(l.url, true)]);
  const scale = 2;
  const c = document.createElement("canvas");
  c.width = dim.w * scale;
  c.height = dim.h * scale;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bg, 0, 0, c.width, c.height);
  const ppi = zone.w / zone.inW;
  const lw = l.wIn * ppi;
  const lh = lw * l.ratio;
  const cx = zone.x + l.nx * zone.w;
  const cy = zone.y + l.ny * zone.h;
  ctx.drawImage(lg, (cx - lw / 2) * scale, (cy - lh / 2) * scale, lw * scale, lh * scale);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.9));
}

export async function uploadBlob(file: File | Blob, name: string): Promise<string> {
  const type = file.type || "application/octet-stream";
  const stageResp = await fetch("/api/shopify-upload/stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: name, mimeType: type, fileSize: file.size }),
  });
  const stage = (await stageResp.json()) as
    | { url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> }
    | { error: string };
  if (!stageResp.ok || "error" in stage) throw new Error("error" in stage ? stage.error : "Upload failed");
  const fd = new FormData();
  for (const p of stage.parameters) fd.append(p.name, p.value);
  fd.append("file", file, name);
  const up = await fetch(stage.url, { method: "POST", body: fd });
  if (!up.ok) throw new Error("Upload failed. Please try again.");
  const regResp = await fetch("/api/shopify-upload/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceUrl: stage.resourceUrl, filename: name, mimeType: type }),
  });
  const reg = (await regResp.json()) as { url: string } | { error: string };
  if (!regResp.ok || "error" in reg) throw new Error("error" in reg ? reg.error : "Upload failed");
  return reg.url;
}

function readLogo(file: File): Promise<{ url: string; ratio: number; pxW: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    im.onload = () => {
      const w = im.naturalWidth || 300;
      const h = im.naturalHeight || 300;
      resolve({ url, ratio: h / w, pxW: w });
    };
    im.src = url;
  });
}

const ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif";

function ShirtView({
  photo, side, logo, setRef, onDown, zone, dim,
}: {
  photo: string; side: Side; logo?: Logo; zone: Zone; dim: { w: number; h: number };
  setRef: (el: SVGSVGElement | null) => void;
  onDown: (e: RPointerEvent<SVGImageElement>) => void;
}) {
  const ppi = zone.w / zone.inW;
  const lw = logo ? logo.wIn * ppi : 0;
  const lh = logo ? lw * logo.ratio : 0;
  const cx = logo ? zone.x + logo.nx * zone.w : 0;
  const cy = logo ? zone.y + logo.ny * zone.h : 0;
  const c = cropBox(zone, dim);
  return (
    <svg ref={setRef} viewBox={`${c.x} ${c.y} ${c.w} ${c.h}`} className="block w-full select-none" role="img" aria-label={`${side} of the shirt`}>
      <rect width={dim.w} height={dim.h} fill="#fff" />
      <image href={photo} x="0" y="0" width={dim.w} height={dim.h} />
      <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="4"
        fill="rgba(24,211,232,0.06)" stroke="#18d3e8" strokeWidth="3" strokeDasharray="10 7" />
      {!logo && (
        <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2} textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.max(14, Math.min(26, zone.w / 7))} fill="#18d3e8" fontWeight="700" fontFamily="sans-serif">
          {zone.label}
        </text>
      )}
      {logo && (
        <image href={logo.url} x={cx - lw / 2} y={cy - lh / 2} width={lw} height={lh}
          preserveAspectRatio="xMidYMid meet" onPointerDown={onDown}
          style={{ cursor: "grab", touchAction: "none", opacity: logo.uploading ? 0.6 : 1 }} />
      )}
    </svg>
  );
}

export type DesignerLogos = Partial<Record<Side, Logo>>;

export default function TeeDesigner({
  photoKey, colorHex, chest, setChest, logos, setLogos,
}: {
  photoKey: PhotoKey;
  colorHex: string | null;
  chest: boolean;
  setChest: (v: boolean) => void;
  logos: DesignerLogos;
  setLogos: (fn: (cur: DesignerLogos) => DesignerLogos) => void;
}) {
  const [msg, setMsg] = useState("");
  const svgs = useRef<Record<Side, SVGSVGElement | null>>({ front: null, back: null });
  const files = useRef<Record<Side, HTMLInputElement | null>>({ front: null, back: null });
  const drag = useRef<{ side: Side; dx: number; dy: number } | null>(null);
  const frontPhoto = useTintedPhoto(`/one-shirt/${photoKey}-front.jpg`, colorHex);
  const backPhoto = useTintedPhoto(`/one-shirt/${photoKey}-back.jpg`, colorHex);
  const photos: Record<Side, string> = { front: frontPhoto, back: backPhoto };

  const zoneOf = (s: Side) => zoneFor(photoKey, s, chest);

  // Keep designs inside the print box when the box changes (e.g. full front → left chest).
  const refit = `${photoKey}-${chest}`;
  useEffect(() => {
    setLogos((cur) => {
      const next: DesignerLogos = { ...cur };
      for (const s of ["front", "back"] as Side[]) {
        const l = cur[s];
        if (!l) continue;
        const z = zoneFor(photoKey, s, chest);
        const wIn = Math.min(l.wIn, Math.min(z.inW, z.inH / l.ratio));
        next[s] = { ...l, wIn, nx: s === "front" ? 0.5 : l.nx, ny: s === "front" ? 0.5 : l.ny };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refit]);

  function toSvg(e: { clientX: number; clientY: number }, side: Side) {
    const svg = svgs.current[side];
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  function clampN(side: Side, l: Logo, nx: number, ny: number) {
    const z = zoneOf(side);
    const ppi = z.w / z.inW;
    const hw = (l.wIn * ppi) / 2 / z.w;
    const hh = (l.wIn * ppi * l.ratio) / 2 / z.h;
    const lo = (h: number) => Math.min(0.5, h);
    return {
      nx: Math.min(1 - lo(hw), Math.max(lo(hw), nx)),
      ny: Math.min(1 - lo(hh), Math.max(lo(hh), ny)),
    };
  }
  function move(e: RPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const l = logos[d.side];
    if (!l) return;
    const z = zoneOf(d.side);
    const p = toSvg(e, d.side);
    const pos = clampN(d.side, l, (p.x - d.dx - z.x) / z.w, (p.y - d.dy - z.y) / z.h);
    setLogos((cur) => (cur[d.side] ? { ...cur, [d.side]: { ...cur[d.side]!, ...pos } } : cur));
  }
  function down(side: Side) {
    return (e: RPointerEvent<SVGImageElement>) => {
      const l = logos[side];
      if (!l) return;
      const z = zoneOf(side);
      const p = toSvg(e, side);
      drag.current = { side, dx: p.x - (z.x + l.nx * z.w), dy: p.y - (z.y + l.ny * z.h) };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    };
  }
  async function pick(side: Side, original?: File) {
    if (!original) return;
    setMsg("");
    if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(original.type)) {
      setMsg("Please use a PNG, JPG, SVG or WebP picture.");
      return;
    }
    try {
      const file = await shrinkToUploadLimit(original);
      const { url, ratio, pxW } = await readLogo(file);
      const z = zoneOf(side);
      const maxW = Math.min(z.inW, z.inH / ratio);
      const wIn = Math.min(maxW, Math.max(1, Math.round(maxW * 0.8 * 4) / 4));
      setLogos((cur) => ({
        ...cur,
        [side]: { url, name: file.name || `${side}-art`, ratio, pxW, vector: file.type === "image/svg+xml", wIn, nx: 0.5, ny: 0.5, uploading: true },
      }));
      try {
        const fileUrl = await uploadBlob(file, file.name || `${side}-art`);
        setLogos((cur) => (cur[side]?.url === url ? { ...cur, [side]: { ...cur[side]!, fileUrl, uploading: false } } : cur));
      } catch (e) {
        const m = e instanceof Error ? e.message : "Upload failed.";
        setLogos((cur) => (cur[side]?.url === url ? { ...cur, [side]: { ...cur[side]!, uploading: false, error: m } } : cur));
      }
    } catch {
      setMsg("We couldn't open that picture. Try another one.");
    }
  }
  function setWidth(side: Side, wIn: number) {
    setLogos((cur) => {
      const l = cur[side];
      if (!l) return cur;
      const next = { ...l, wIn };
      return { ...cur, [side]: { ...next, ...clampN(side, next, l.nx, l.ny) } };
    });
  }
  function removeLogo(side: Side) {
    setLogos((cur) => ({ ...cur, [side]: undefined }));
  }

  const chip = (on: boolean) =>
    "rounded-xl border px-3 py-1.5 text-xs font-bold transition " +
    (on ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]" : "border-white/15 bg-surface text-white/80");

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-3 sm:gap-5"
        onPointerMove={move}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {(["front", "back"] as Side[]).map((s) => {
          const dim = IMG[photoKey][s];
          const z = zoneOf(s);
          const l = logos[s];
          const q = l ? quality(l) : null;
          const maxW = l ? Math.min(z.inW, z.inH / l.ratio) : 0;
          return (
            <div key={s}>
              <p className="text-center text-base font-bold">{s === "front" ? "Front" : "Back"}</p>
              {s === "front" ? (
                <div className="mb-2 mt-1 grid grid-cols-2 gap-1">
                  <button type="button" className={chip(!chest)} onClick={() => setChest(false)}>Full front</button>
                  <button type="button" className={chip(chest)} onClick={() => setChest(true)}>Left chest</button>
                </div>
              ) : (
                <p className="mb-2 mt-1 text-center text-xs text-white/55">{z.label}</p>
              )}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                <ShirtView photo={photos[s]} side={s} logo={l} zone={z} dim={dim}
                  setRef={(el) => { svgs.current[s] = el; }} onDown={down(s)} />
              </div>
              <p className="mt-1 text-center text-xs text-white/50">Up to {z.inW}×{z.inH} in</p>
              <input ref={(el) => { files.current[s] = el; }} type="file" accept={ACCEPT} className="hidden"
                onChange={(e) => { void pick(s, e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" className="mt-2 w-full rounded-xl bg-[#d9f000] px-2 py-3 text-sm font-bold text-black"
                onClick={() => files.current[s]?.click()}>
                {l ? "Change design" : "Upload your design"}
              </button>
              {l && q ? (
                <div className="mt-2 space-y-1">
                  <input aria-label={`${s} size`} type="range" min={1} max={Math.max(1, Math.round(maxW * 4) / 4)} step={0.25}
                    value={Math.min(l.wIn, maxW)} onChange={(e) => setWidth(s, Number(e.target.value))} className="w-full" />
                  <div className="flex items-center justify-between text-xs text-white/65">
                    <span>{l.wIn.toFixed(1)} × {(l.wIn * l.ratio).toFixed(1)} in</span>
                    <button type="button" className="underline" onClick={() => removeLogo(s)}>Remove</button>
                  </div>
                  <p className={"rounded-md px-2 py-1 text-xs font-bold " +
                    (l.error || q.level === "low" ? "bg-[#ff9aa2]/15 text-[#ff9aa2]" : "bg-[#d9f000]/10 text-[#d9f000]")}>
                    {l.uploading && "Saving your design…"}
                    {!l.uploading && l.error && `${l.error} Tap Change design to retry.`}
                    {!l.uploading && !l.error && q.level === "vector" && "✓ Sharp at any size"}
                    {!l.uploading && !l.error && q.level === "great" && "✓ Great quality"}
                    {!l.uploading && !l.error && q.level === "good" && "✓ Good quality"}
                    {!l.uploading && !l.error && q.level === "low" && "Blurry at this size. Make it smaller or upload a bigger file."}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-white/55">Drag to move. Slide to resize. One side is fine.</p>
      {msg && <p className="mt-2 text-center text-sm text-[#ff9aa2]">{msg}</p>}
      <details className="mt-3 rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-white/75">
        <summary className="cursor-pointer font-bold text-white">Tips for a sharp print</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
          <li>Best: SVG, or a PNG with a see-through background. Aim for 300 DPI (200 minimum).</li>
          <li>Colors on the shirt photo are a preview. Dark art can disappear on dark shirts.</li>
          <li>AI-made art may need a redraw. We&apos;ll tell you before we print.</li>
          <li>Need design help? Order first, then message us.</li>
        </ul>
      </details>
    </div>
  );
}
