"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from "react";
import { shrinkToUploadLimit } from "@/lib/shrink-image";

type Garment = "cotton" | "performance" | "polo";
type Side = "front" | "back";
type PhotoKey = "polo" | "tee-short" | "tee-long";
type Zone = { x: number; y: number; w: number; h: number; inW: number; inH: number; label: string };
type Logo = {
  url: string;
  file: File;
  ratio: number; // height / width
  pxW: number;
  vector: boolean;
  cx: number; // center, in photo pixels
  cy: number;
  wIn: number; // printed width in inches
};

// Photo sizes + print boxes (pixels of each photo; inches = real print size).
// ppi of a box = w / inW. Sleeves are not printable.
const IMG: Record<PhotoKey, Record<Side, { w: number; h: number }>> = {
  polo: { front: { w: 744, h: 866 }, back: { w: 733, h: 896 } },
  "tee-short": { front: { w: 690, h: 883 }, back: { w: 678, h: 883 } },
  "tee-long": { front: { w: 752, h: 916 }, back: { w: 745, h: 917 } },
};
const ZONE: Record<PhotoKey, { full?: Zone; chest: Zone; back: Zone }> = {
  polo: {
    chest: { x: 425, y: 190, w: 88, h: 88, inW: 5, inH: 5, label: "Left chest" },
    back: { x: 252, y: 120, w: 210, h: 245, inW: 12, inH: 14, label: "Full back" },
  },
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

// Zoomed-in view around the print box so designs are easy to see.
function cropBox(z: Zone, dim: { w: number; h: number }) {
  const vw = Math.min(dim.w, Math.max(z.w * 1.9, 260));
  const vh = Math.min(dim.h, Math.max(z.h * 1.6, vw * 1.1));
  const x = Math.min(dim.w - vw, Math.max(0, z.x + z.w / 2 - vw / 2));
  const y = Math.min(dim.h - vh, Math.max(0, z.y - (vh - z.h) * 0.3));
  return { x, y, w: vw, h: vh };
}

const GARMENTS: Record<Garment, { label: string; base: number; polo: boolean }> = {
  cotton: { label: "Cotton tee", base: 25, polo: false },
  performance: { label: "Performance tee", base: 25, polo: false },
  polo: { label: "Polo", base: 40, polo: true },
};
const CHOICES: Array<{ g: Garment; long: boolean; sub: string }> = [
  { g: "cotton", long: false, sub: "Short sleeve" },
  { g: "cotton", long: true, sub: "Long sleeve" },
  { g: "performance", long: false, sub: "Short sleeve" },
  { g: "performance", long: true, sub: "Long sleeve" },
  { g: "polo", long: false, sub: "Short sleeve" },
];
const SIZES = ["S", "M", "L", "XL", "2XL"];
const RUSH_FEE = 15;
const ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif";
const field = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base text-white placeholder:text-white/40";

function quality(l: Logo): { dpi: number; level: "great" | "good" | "low" | "vector" } {
  if (l.vector) return { dpi: 0, level: "vector" };
  const dpi = Math.round(l.pxW / l.wIn);
  return { dpi, level: dpi >= 300 ? "great" : dpi >= 200 ? "good" : "low" };
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

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("img"));
    im.src = src;
  });
}

async function renderMockup(photo: string, w: number, h: number, zone: Zone, l: Logo): Promise<Blob> {
  const [bg, lg] = await Promise.all([loadImg(photo), loadImg(l.url)]);
  const scale = 2;
  const c = document.createElement("canvas");
  c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bg, 0, 0, c.width, c.height);
  const ppi = zone.w / zone.inW;
  const lw = l.wIn * ppi;
  const lh = lw * l.ratio;
  ctx.drawImage(lg, (l.cx - lw / 2) * scale, (l.cy - lh / 2) * scale, lw * scale, lh * scale);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.9));
}

async function uploadFile(file: File | Blob, name: string): Promise<string> {
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
  return (
    <svg ref={setRef} viewBox={(() => { const c = cropBox(zone, dim); return `${c.x} ${c.y} ${c.w} ${c.h}`; })()} className="block w-full select-none" role="img" aria-label={`${side} of the shirt`}>
      <rect width={dim.w} height={dim.h} fill="#fff" />
      <image href={photo} x="0" y="0" width={dim.w} height={dim.h} />
      <rect
        x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="4"
        fill="rgba(24,211,232,0.06)" stroke="#18d3e8" strokeWidth="3" strokeDasharray="10 7"
      />
      {!logo && (
        <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2} textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.max(14, Math.min(26, zone.w / 7))} fill="#18d3e8" fontWeight="700" fontFamily="sans-serif">
          {zone.label}
        </text>
      )}
      {logo && (
        <image
          href={logo.url}
          x={logo.cx - lw / 2} y={logo.cy - lh / 2} width={lw} height={lh}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onDown}
          style={{ cursor: "grab", touchAction: "none" }}
        />
      )}
    </svg>
  );
}

export default function OneShirt() {
  const [garment, setGarment] = useState<Garment>("cotton");
  const [long, setLong] = useState(false);
  const [chest, setChest] = useState(false);
  const [size, setSize] = useState("L");
  const [proof, setProof] = useState(true);
  const [rush, setRush] = useState(false);
  const [logos, setLogos] = useState<Partial<Record<Side, Logo>>>({});
  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const svgs = useRef<Record<Side, SVGSVGElement | null>>({ front: null, back: null });
  const files = useRef<Record<Side, HTMLInputElement | null>>({ front: null, back: null });
  const drag = useRef<{ side: Side; dx: number; dy: number } | null>(null);
  const artRef = useRef<HTMLElement | null>(null);

  const g = GARMENTS[garment];
  const isLong = !g.polo && long;
  const photoKey: PhotoKey = g.polo ? "polo" : isLong ? "tee-long" : "tee-short";
  const zones = ZONE[photoKey];
  const frontChest = g.polo || chest;
  const zoneOf = (s: Side): Zone => (s === "back" ? zones.back : frontChest ? zones.chest : (zones.full ?? zones.chest));
  const price = g.base + (isLong ? 2 : 0) + (size === "2XL" ? 4 : 0);
  const total = price + (rush ? RUSH_FEE : 0);
  const hasArt = !!(logos.front || logos.back);
  const refit = `${photoKey}-${frontChest}`;

  // Re-fit designs when the shirt or print spot changes.
  useEffect(() => {
    setLogos((cur) => {
      const next: Partial<Record<Side, Logo>> = {};
      for (const s of ["front", "back"] as Side[]) {
        const l = cur[s];
        if (!l) continue;
        const z = s === "back" ? ZONE[photoKey].back : frontChest ? ZONE[photoKey].chest : (ZONE[photoKey].full ?? ZONE[photoKey].chest);
        const wIn = Math.min(l.wIn, Math.min(z.inW, z.inH / l.ratio));
        next[s] = { ...l, wIn, cx: z.x + z.w / 2, cy: z.y + z.h / 2 };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refit]);

  function toSvg(e: { clientX: number; clientY: number }, side: Side) {
    const svg = svgs.current[side];
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  function clampPos(side: Side, l: Logo, cx: number, cy: number) {
    const z = zoneOf(side);
    const ppi = z.w / z.inW;
    const hw = (l.wIn * ppi) / 2;
    const hh = (l.wIn * ppi * l.ratio) / 2;
    return {
      cx: Math.min(z.x + z.w - hw, Math.max(z.x + hw, cx)),
      cy: Math.min(z.y + z.h - hh, Math.max(z.y + hh, cy)),
    };
  }
  function move(e: RPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const l = logos[d.side];
    if (!l) return;
    const p = toSvg(e, d.side);
    const pos = clampPos(d.side, l, p.x - d.dx, p.y - d.dy);
    setLogos((cur) => ({ ...cur, [d.side]: { ...l, ...pos } }));
  }
  function down(side: Side) {
    return (e: RPointerEvent<SVGImageElement>) => {
      const l = logos[side];
      if (!l) return;
      const p = toSvg(e, side);
      drag.current = { side, dx: p.x - l.cx, dy: p.y - l.cy };
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
      setLogos((cur) => {
        if (cur[side]) URL.revokeObjectURL(cur[side]!.url);
        return {
          ...cur,
          [side]: { url, file, ratio, pxW, vector: file.type === "image/svg+xml", wIn, cx: z.x + z.w / 2, cy: z.y + z.h / 2 },
        };
      });
    } catch {
      setMsg("We couldn't open that picture. Try another one.");
    }
  }
  function setWidth(side: Side, wIn: number) {
    const l = logos[side];
    if (!l) return;
    const next = { ...l, wIn };
    const pos = clampPos(side, next, l.cx, l.cy);
    setLogos((cur) => ({ ...cur, [side]: { ...next, ...pos } }));
  }
  function removeLogo(side: Side) {
    const l = logos[side];
    if (l) URL.revokeObjectURL(l.url);
    setLogos((cur) => ({ ...cur, [side]: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!hasArt) {
      setMsg("Upload a design for the front or back first.");
      artRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      const out: Partial<Record<Side, Record<string, unknown>>> = {};
      for (const s of ["front", "back"] as Side[]) {
        const l = logos[s];
        if (!l) continue;
        setBusy(`Uploading ${s}…`);
        const dim = IMG[photoKey][s];
        const z = zoneOf(s);
        const q = quality(l);
        const orig = await uploadFile(l.file, l.file.name || `${s}-art`);
        const mock = await renderMockup(`/one-shirt/${photoKey}-${s}.jpg`, dim.w, dim.h, z, l);
        const mockUrl = await uploadFile(mock, `${s}-mockup.jpg`);
        out[s] = {
          fileUrl: orig,
          fileName: l.file.name,
          mockupUrl: mockUrl,
          area: z.label,
          widthIn: l.wIn,
          heightIn: l.wIn * l.ratio,
          quality: q.level === "vector" ? "Vector (sharp at any size)" : `${q.dpi} DPI at print size (${q.level})`,
        };
      }
      setBusy("Opening checkout…");
      const res = await fetch("/api/one-shirt-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garment, long: isLong, size, rush, proof, notes, ...out }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; invoiceUrl?: string };
      if (!res.ok || !data.invoiceUrl) throw new Error(data.error || "Could not start checkout. Please call (772) 985-2854.");
      window.location.href = data.invoiceUrl;
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong. Please try again.");
      setBusy("");
    }
  }

  const chip = (on: boolean) =>
    "rounded-xl border px-3 py-2.5 text-sm font-bold transition " +
    (on ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]" : "border-white/15 bg-surface text-white/80");
  const h2 = "mb-2 font-headline text-xs uppercase tracking-widest text-[#18d3e8]";
  const card = (on: boolean) =>
    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition " +
    (on ? "border-[#18d3e8] bg-[#18d3e8]/10" : "border-white/15 bg-surface");
  const dot = (on: boolean, sq = false) =>
    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 text-[10px] leading-none " +
    (sq ? "rounded " : "rounded-full ") +
    (on ? "border-[#18d3e8] bg-[#18d3e8] text-black" : "border-white/40");

  const buyBtn = (cls: string) => (
    <button type="submit" form="os-form" disabled={!!busy}
      className={"min-h-12 rounded-xl bg-[#18d3e8] px-4 py-3 text-base font-black uppercase text-black disabled:opacity-60 " + cls}>
      {busy || "Buy now"}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:pb-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
          One shirt. <span className="bg-linear-to-r from-[#d94cb3] to-[#18d3e8] bg-clip-text text-transparent">No minimum.</span>
        </h1>
        <p className="mt-2 text-base text-white/75">Pick it. Upload your design. Check out.</p>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
        <div>
          <section>
            <h2 className={h2}>1 · Pick your shirt</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {CHOICES.map((c) => {
                const it = GARMENTS[c.g];
                const on = garment === c.g && (it.polo || long === c.long);
                const p = it.base + (c.long ? 2 : 0);
                return (
                  <button key={c.g + c.long} type="button" aria-pressed={on}
                    onClick={() => { setGarment(c.g); setLong(c.long); }}
                    className={"overflow-hidden rounded-2xl border text-center transition " + (on ? "border-[#18d3e8] ring-2 ring-[#18d3e8]/50" : "border-white/15 bg-surface")}>
                    <div className="bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/one-shirt/${it.polo ? "polo" : c.long ? "tee-long" : "tee-short"}-front.jpg`} alt={`${it.label}, ${c.sub.toLowerCase()}`}
                        className="mx-auto h-40 w-full object-contain sm:h-48" loading="lazy" />
                    </div>
                    <div className="px-2 py-3">
                      <div className="text-sm font-bold leading-tight">{it.label}</div>
                      <div className="text-xs text-white/60">{c.sub}</div>
                      <div className="mt-1 font-display text-xl font-black text-[#d9f000]">${p}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-8" ref={artRef}>
            <h2 className={h2}>2 · Upload your designs</h2>
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
                    {s === "front" && !g.polo ? (
                      <div className="mb-2 mt-1 grid grid-cols-2 gap-1">
                        <button type="button" className={chip(!chest) + " py-1.5 text-xs"} onClick={() => setChest(false)}>Full front</button>
                        <button type="button" className={chip(chest) + " py-1.5 text-xs"} onClick={() => setChest(true)}>Left chest</button>
                      </div>
                    ) : (
                      <p className="mb-2 mt-1 text-center text-xs text-white/55">{z.label}</p>
                    )}
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                      <ShirtView
                        photo={`/one-shirt/${photoKey}-${s}.jpg`} side={s} logo={l} zone={z} dim={dim}
                        setRef={(el) => { svgs.current[s] = el; }} onDown={down(s)}
                      />
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
                          (q.level === "low" ? "bg-[#ff9aa2]/15 text-[#ff9aa2]" : "bg-[#d9f000]/10 text-[#d9f000]")}>
                          {q.level === "vector" && "✓ Sharp at any size"}
                          {q.level === "great" && "✓ Great quality"}
                          {q.level === "good" && "✓ Good quality"}
                          {q.level === "low" && "Blurry at this size. Make it smaller or upload a bigger file."}
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
                <li>Light colors show best on black. Dark art can disappear.</li>
                <li>AI-made art (ChatGPT and similar) may need a redraw. We&apos;ll tell you before we print.</li>
                <li>Need design help? Order first, then message us.</li>
              </ul>
            </details>
          </section>
        </div>

        <form id="os-form" onSubmit={submit} className="mt-8 space-y-6 lg:sticky lg:top-24 lg:mt-0 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/30 lg:p-5">
          <section>
            <h2 className={h2}>3 · Size</h2>
            <div className="grid grid-cols-5 gap-2">
              {SIZES.map((z) => (
                <button key={z} type="button" className={chip(size === z) + " px-1"} onClick={() => setSize(z)}>{z}</button>
              ))}
            </div>
            {size === "2XL" && <p className="mt-1 text-xs text-white/55">2XL is +$4.</p>}
          </section>

          <section>
            <h2 className={h2}>4 · Proof</h2>
            <div className="space-y-2">
              <button type="button" className={card(proof)} onClick={() => setProof(true)} aria-pressed={proof}>
                <span className={dot(proof)} />
                <span>
                  <span className="block text-sm font-bold">Send me a proof <span className="font-normal text-[#d9f000]">· free</span></span>
                  <span className="block text-xs text-white/65">Nothing prints until you say OK.</span>
                </span>
              </button>
              <button type="button" className={card(!proof)} onClick={() => setProof(false)} aria-pressed={!proof}>
                <span className={dot(!proof)} />
                <span>
                  <span className="block text-sm font-bold">No proof. Print it as shown.</span>
                  <span className="block text-xs text-white/65">Fastest. Prints exactly like your picture above.</span>
                </span>
              </button>
            </div>
          </section>

          <section>
            <h2 className={h2}>5 · Speed</h2>
            <button type="button" className={card(rush)} onClick={() => setRush(!rush)} aria-pressed={rush}>
              <span className={dot(rush, true)}>{rush ? "✓" : ""}</span>
              <span>
                <span className="block text-sm font-bold">Rush: 2 business days <span className="font-normal text-[#d9f000]">· +$15</span></span>
                <span className="block text-xs text-white/65">Otherwise 3–5 business days.</span>
              </span>
            </button>
          </section>

          <section>
            <textarea className={field} rows={2} placeholder="Notes for us (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>

          <div className="hidden lg:block">
            <div className="mb-3 flex items-end justify-between">
              <span className="text-sm text-white/70">Total</span>
              <span className="font-display text-4xl font-black text-[#d9f000]">${total}</span>
            </div>
            {buyBtn("w-full")}
            {err && <p className="mt-2 text-sm text-[#ff9aa2]">{err}</p>}
            <p className="mt-2 text-center text-xs text-white/50">Custom item. Final sale unless we make a mistake.</p>
          </div>
          {err && <p className="text-sm text-[#ff9aa2] lg:hidden">{err}</p>}
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0b0f]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="leading-tight">
            <div className="text-xs text-white/60">Total{rush ? " (rush)" : ""}</div>
            <div className="font-display text-3xl font-black text-[#d9f000]">${total}</div>
          </div>
          {buyBtn("flex-1")}
        </div>
      </div>
    </div>
  );
}
