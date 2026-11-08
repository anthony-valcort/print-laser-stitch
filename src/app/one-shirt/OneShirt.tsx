"use client";

import { useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from "react";

type Style = "tee" | "polo";
type Fabric = "cotton" | "polyester";
type Side = "front" | "back";
type Logo = { url: string; ratio: number; cx: number; cy: number; w: number };

// Real garment photos live in /public/one-shirt/<style>-<fabric>-<sleeve>-<side>.jpg.
// Add a key here once its photo is uploaded; until then a drawing is shown.
const PHOTOS = new Set<string>([]);
const SIZES = ["S", "M", "L", "XL", "2XL"];
const AREA: Record<Side, { x: number; y: number; w: number; h: number }> = {
  front: { x: 120, y: 118, w: 160, h: 200 },
  back: { x: 115, y: 100, w: 170, h: 240 },
};
const field = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base text-white";

function price(style: Style, size: string, long: boolean) {
  return (style === "polo" ? 40 : 25) + (size === "2XL" ? 4 : 0) + (long ? 2 : 0);
}

function shirtPath(style: Style, long: boolean, side: Side) {
  const neck = side === "front" ? "Q200 72 265 30" : "Q200 48 265 30";
  const sleeve = long ? "L395 340 L350 352 L305 160" : "L385 135 L330 160 L305 128";
  const sleeveL = long ? "L95 160 L50 352 L5 340" : "L95 128 L70 160 L15 135";
  void style;
  return `M135 30 ${neck} L340 62 ${sleeve} L305 400 Q305 412 293 412 L107 412 Q95 412 95 400 ${sleeveL} L60 62 Z`;
}

function ShirtSvg({
  style, long, side, logo, setRef, onDown, photo,
}: {
  style: Style; long: boolean; side: Side; logo?: Logo;
  setRef: (el: SVGSVGElement | null) => void;
  onDown: (e: RPointerEvent<SVGImageElement>) => void;
  photo?: string;
}) {
  const a = AREA[side];
  const lw = logo ? logo.w : 0;
  const lh = logo ? lw * logo.ratio : 0;
  return (
    <svg ref={setRef} viewBox="0 0 400 440" className="mx-auto block w-full touch-none select-none">
      <rect width="400" height="440" fill="#d9dde3" />
      {photo ? (
        <image href={photo} x="0" y="0" width="400" height="440" preserveAspectRatio="xMidYMid meet" />
      ) : (
        <path d={shirtPath(style, long, side)} fill="#121214" stroke="#3b3b42" strokeWidth="2" strokeLinejoin="round" />
      )}
      {!photo && style === "polo" && side === "front" && (
        <g stroke="#3b3b42" strokeWidth="2" fill="none">
          <path d="M135 30 L170 78 L200 52 L230 78 L265 30" />
          <path d="M200 52 V150" />
          <circle cx="200" cy="82" r="2.5" fill="#3b3b42" />
          <circle cx="200" cy="112" r="2.5" fill="#3b3b42" />
        </g>
      )}
      {!photo && style === "polo" && side === "back" && (
        <path d="M135 30 Q200 56 265 30" stroke="#3b3b42" strokeWidth="2" fill="none" />
      )}
      <rect x={a.x} y={a.y} width={a.w} height={a.h} rx="6" fill="none" stroke="#18d3e8" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.8" />
      {logo && (
        <image
          href={logo.url}
          x={logo.cx - lw / 2}
          y={logo.cy - lh / 2}
          width={lw}
          height={lh}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onDown}
          style={{ cursor: "grab" }}
        />
      )}
      <text x="200" y="432" textAnchor="middle" fontSize="13" fill="#555" fontFamily="sans-serif">{side === "front" ? "FRONT" : "BACK"}</text>
    </svg>
  );
}

async function svgToJpeg(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("rect[stroke-dasharray]").forEach((n) => n.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", "800");
  clone.setAttribute("height", "880");
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const loaded = new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("render")); });
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  await loaded;
  const c = document.createElement("canvas");
  c.width = 800; c.height = 880;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 800, 880);
  ctx.drawImage(img, 0, 0, 800, 880);
  return c.toDataURL("image/jpeg", 0.85);
}

function readLogo(file: File): Promise<{ url: string; ratio: number }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read"));
    fr.onload = () => {
      const url = String(fr.result);
      const im = new Image();
      im.onerror = () => reject(new Error("img"));
      im.onload = () => resolve({ url, ratio: (im.naturalHeight || 1) / (im.naturalWidth || 1) });
      im.src = url;
    };
    fr.readAsDataURL(file);
  });
}

export default function OneShirt() {
  const [style, setStyle] = useState<Style>("tee");
  const [fabric, setFabric] = useState<Fabric>("cotton");
  const [long, setLong] = useState(false);
  const [size, setSize] = useState("L");
  const [logos, setLogos] = useState<Partial<Record<Side, Logo>>>({});
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const svgs = useRef<Record<Side, SVGSVGElement | null>>({ front: null, back: null });
  const files = useRef<Record<Side, HTMLInputElement | null>>({ front: null, back: null });
  const drag = useRef<{ side: Side; dx: number; dy: number } | null>(null);
  const fabricKey = style === "polo" ? "polo" : fabric;
  const photoFor = (s: Side) => {
    const k = `${style}-${fabricKey}-${long ? "long" : "short"}-${s}`;
    return PHOTOS.has(k) ? `/one-shirt/${k}.jpg` : undefined;
  };

  const total = price(style, size, long);

  function toSvg(e: { clientX: number; clientY: number }, side: Side) {
    const svg = svgs.current[side];
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  function move(e: RPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const lg = logos[d.side];
    if (!lg) return;
    const area = AREA[d.side];
    const p = toSvg(e, d.side);
    const cx = Math.min(area.x + area.w, Math.max(area.x, p.x - d.dx));
    const cy = Math.min(area.y + area.h, Math.max(area.y, p.y - d.dy));
    setLogos((l) => ({ ...l, [d.side]: { ...lg, cx, cy } }));
  }
  function down(side: Side) {
    return (e: RPointerEvent<SVGImageElement>) => {
      const lg = logos[side];
      if (!lg) return;
      const p = toSvg(e, side);
      drag.current = { side, dx: p.x - lg.cx, dy: p.y - lg.cy };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    };
  }
  async function pick(side: Side, file?: File) {
    if (!file) return;
    setMsg("");
    if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(file.type)) { setMsg("Please pick a picture (PNG, JPG or SVG)."); return; }
    if (file.size > 8_000_000) { setMsg("That file is too big. Try one under 8 MB."); return; }
    try {
      const area = AREA[side];
      const { url, ratio } = await readLogo(file);
      const w = area.w * 0.6;
      setLogos((l) => ({ ...l, [side]: { url, ratio, w, cx: area.x + area.w / 2, cy: area.y + Math.min(area.h / 2, (w * ratio) / 2 + 8) } }));
    } catch {
      setMsg("We couldn't open that picture. Try another one.");
    }
  }
  function resize(side: Side, pct: number) {
    const lg = logos[side];
    if (!lg) return;
    setLogos((l) => ({ ...l, [side]: { ...lg, w: (AREA[side].w * pct) / 100 } }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const images: { view: string; dataUrl: string }[] = [];
      for (const s of ["front", "back"] as Side[]) {
        const el = svgs.current[s];
        if (logos[s] && el) images.push({ view: s, dataUrl: await svgToJpeg(el) });
      }
      const kind = style === "polo" ? "Polo (printed only)" : `${fabric === "cotton" ? "Cotton" : "Polyester"} T-shirt`;
      const res = await fetch("/api/shirt-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          item: `${kind}, ${long ? "long" : "short"} sleeve, black, size ${size}`,
          price: total,
          sides: Object.keys(logos).join(" + ") || "none",
          images,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send. Please call (772) 985-2854.");
      setDone(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    "rounded-xl border px-4 py-3 text-sm font-bold transition " +
    (on ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]" : "border-white/15 bg-surface text-white/80");

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-4 font-display text-3xl font-black uppercase">Got it!</h2>
        <p className="mt-3 text-lg text-white/80">We&apos;ll email you to confirm. Pay when you pick it up in Stuart.</p>
        <button type="button" className="mt-6 rounded-xl bg-[#d9f000] px-6 py-3 font-bold text-black" onClick={() => { setDone(false); setLogos({}); }}>
          Make another
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
          One shirt. <span className="bg-linear-to-r from-[#d94cb3] to-[#18d3e8] bg-clip-text text-transparent">No minimum.</span>
        </h1>
        <p className="mt-2 text-base text-white/75">Made in Stuart. Printed front and back. Ready in a few days.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-bold uppercase">
          <span className="rounded-full bg-white px-3 py-1.5 text-black">Black only · in stock</span>
          <span className="rounded-full border border-white/20 px-3 py-1.5">Pickup in Stuart</span>
          <span className="rounded-full border border-white/20 px-3 py-1.5">Print included</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6" onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        {(["front", "back"] as Side[]).map((s) => {
          const lg = logos[s];
          return (
            <div key={s}>
              <p className="mb-2 text-center font-headline text-xs uppercase tracking-widest text-[#18d3e8]">{s === "front" ? "Front" : "Back"}</p>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <ShirtSvg style={style} long={long} side={s} logo={lg} setRef={(el) => { svgs.current[s] = el; }} onDown={down(s)} photo={photoFor(s)} />
              </div>
              <input ref={(el) => { files.current[s] = el; }} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" className="hidden" onChange={(e) => { void pick(s, e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" className="mt-2 w-full rounded-xl bg-[#d9f000] px-2 py-3 text-sm font-bold text-black" onClick={() => files.current[s]?.click()}>
                {lg ? "Change picture" : "Add picture"}
              </button>
              {lg ? (
                <div className="mt-2 flex items-center gap-2">
                  <input aria-label="Size" type="range" min={20} max={100} value={Math.round((lg.w / AREA[s].w) * 100)} onChange={(e) => resize(s, Number(e.target.value))} className="min-w-0 flex-1" />
                  <button type="button" className="shrink-0 text-xs text-white/60 underline" onClick={() => setLogos((l) => ({ ...l, [s]: undefined }))}>Remove</button>
                </div>
              ) : (
                <p className="mt-2 text-center text-xs text-white/45">Optional</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-white/50">Drag a picture to move it. Use the slider to make it bigger or smaller.</p>
      {msg && <p className="mt-2 text-center text-sm text-[#ff9aa2]">{msg}</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <section>
            <h2 className="mb-2 font-headline text-xs uppercase tracking-widest text-[#18d3e8]">1 · Shirt</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={chip(style === "tee")} onClick={() => setStyle("tee")}>T-shirt</button>
              <button type="button" className={chip(style === "polo")} onClick={() => setStyle("polo")}>Polo</button>
            </div>
            {style === "tee" ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" className={chip(fabric === "cotton")} onClick={() => setFabric("cotton")}>Cotton</button>
                <button type="button" className={chip(fabric === "polyester")} onClick={() => setFabric("polyester")}>Polyester</button>
              </div>
            ) : (
              <p className="mt-2 rounded-lg bg-[#d9f000]/10 px-3 py-2 text-sm text-[#d9f000]">Polos are printed only. No embroidery.</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className={chip(!long)} onClick={() => setLong(false)}>Short sleeve</button>
              <button type="button" className={chip(long)} onClick={() => setLong(true)}>Long sleeve +$2</button>
            </div>
          </section>
          <section>
            <h2 className="mb-2 font-headline text-xs uppercase tracking-widest text-[#18d3e8]">2 · Size</h2>
            <div className="grid grid-cols-5 gap-2">
              {SIZES.map((z) => (
                <button key={z} type="button" className={chip(size === z) + " px-1"} onClick={() => setSize(z)}>{z}</button>
              ))}
            </div>
            {size === "2XL" && <p className="mt-1 text-xs text-white/55">2XL is +$4.</p>}
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-surface p-4">
          <div className="flex items-end justify-between">
            <span className="text-sm text-white/70">Total</span>
            <span className="font-display text-4xl font-black text-[#d9f000]">${total}</span>
          </div>
          <p className="text-xs text-white/50">Print front and back included. Pay at pickup.</p>
          <form onSubmit={submit} className="mt-4 space-y-2">
            <input required className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            <input required type="email" className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            <input className={field} type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#18d3e8] px-4 py-3.5 text-base font-black uppercase text-black disabled:opacity-60">
              {busy ? "Sending…" : "Reserve my shirt"}
            </button>
            {err && <p className="text-sm text-[#ff9aa2]">{err}</p>}
          </form>
        </section>
      </div>
    </div>
  );
}
