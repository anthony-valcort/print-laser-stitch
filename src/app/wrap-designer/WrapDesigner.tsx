"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WRAP_TEMPLATES } from "@/lib/wrap-templates";

type Kind = "image" | "text" | "rect" | "ellipse";
type Layer = {
  id: string;
  kind: Kind;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  fill: string;
  href?: string;
  text?: string;
  font?: string;
  bold?: boolean;
  name: string;
};
type Design = { color: string; layers: Record<string, Layer[]> };
type ViewSrc = { vb: [number, number, number, number]; body: string; details: string };
type Drag = {
  mode: "move" | "scale" | "rot";
  id: string;
  start: { x: number; y: number };
  orig: Layer;
  before: Design;
};

const FONTS = ["Arial Black", "Impact", "Arial", "Verdana", "Trebuchet MS", "Georgia", "Times New Roman", "Courier New"];
const SWATCHES = ["#ffffff", "#111111", "#c1121f", "#0b5fff", "#0f8a4b", "#f4b400", "#ff6a00", "#6d28d9", "#6b7280"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function measureText(text: string, font: string, bold: boolean, size: number) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return size * Math.max(1, text.length) * 0.6;
  ctx.font = `${bold ? "bold " : ""}${size}px "${font}"`;
  return Math.max(size * 0.5, ctx.measureText(text || " ").width);
}

function parseView(svg: string): ViewSrc {
  const m = /viewBox="([^"]+)"/.exec(svg);
  const vb = (m ? m[1] : "0 0 100 100").split(/\s+/).map(Number) as [number, number, number, number];
  const inner = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  const i = inner.indexOf('<g id="details"');
  return { vb, body: inner.slice(0, i), details: inner.slice(i) };
}

function layerMarkup(l: Layer): string {
  const t = `transform="translate(${l.cx} ${l.cy}) rotate(${l.rot})" opacity="${l.opacity}"`;
  const hw = l.w / 2;
  const hh = l.h / 2;
  if (l.kind === "image") {
    return `<g ${t}><image x="${-hw}" y="${-hh}" width="${l.w}" height="${l.h}" preserveAspectRatio="none" href="${l.href ?? ""}"/></g>`;
  }
  if (l.kind === "rect") {
    return `<g ${t}><rect x="${-hw}" y="${-hh}" width="${l.w}" height="${l.h}" fill="${l.fill}"/></g>`;
  }
  if (l.kind === "ellipse") {
    return `<g ${t}><ellipse rx="${hw}" ry="${hh}" fill="${l.fill}"/></g>`;
  }
  return `<g ${t}><text text-anchor="middle" dominant-baseline="central" font-family="${l.font ?? "Arial"}" font-weight="${
    l.bold ? 700 : 400
  }" font-size="${l.h * 0.8}" textLength="${l.w}" lengthAdjust="spacingAndGlyphs" fill="${l.fill}">${esc(l.text ?? "")}</text></g>`;
}

function bodyMarkup(src: ViewSrc, color: string) {
  return src.body.replace('<g id="bodyfill" class="body">', `<g id="bodyfill" fill="${color}">`);
}

async function renderView(src: ViewSrc, design: Design, view: string, width: number, mime: string, q: number) {
  const [x, y, w, h] = src.vb;
  const height = Math.round((width * h) / w);
  const art = (design.layers[view] ?? []).map(layerMarkup).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${width}" height="${height}" style="isolation:isolate">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${bodyMarkup(src, design.color)}` +
    `<g clip-path="url(#bodyclip)">${art}</g>${src.details}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("render failed"));
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return c.toDataURL(mime, q);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readImage(file: File): Promise<{ href: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read failed"));
    fr.onload = () => {
      const src = String(fr.result);
      const img = new Image();
      img.onerror = () => reject(new Error("bad image"));
      img.onload = () => {
        const nw = img.naturalWidth || 400;
        const nh = img.naturalHeight || 400;
        const max = 1600;
        if (file.type === "image/svg+xml" || Math.max(nw, nh) <= max) {
          resolve({ href: src, w: nw, h: nh });
          return;
        }
        const k = max / Math.max(nw, nh);
        const c = document.createElement("canvas");
        c.width = Math.round(nw * k);
        c.height = Math.round(nh * k);
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve({ href: c.toDataURL("image/png"), w: nw, h: nh });
      };
      img.src = src;
    };
    fr.readAsDataURL(file);
  });
}

const uid = () => Math.random().toString(36).slice(2, 9);
const btn =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-[#18d3e8]/60 disabled:opacity-40";

export default function WrapDesigner() {
  const tpl = WRAP_TEMPLATES[0];
  const [srcs, setSrcs] = useState<Record<string, ViewSrc>>({});
  const [loadErr, setLoadErr] = useState(false);
  const [view, setView] = useState(tpl.views[0].key);
  const [design, setDesign] = useState<Design>({ color: "#ffffff", layers: {} });
  const [past, setPast] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [cw, setCw] = useState(360);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [sent, setSent] = useState<"" | "sending" | "ok" | string>("");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const designRef = useRef(design);
  designRef.current = design;

  useEffect(() => {
    let off = false;
    Promise.all(
      tpl.views.map((v) =>
        fetch(`${tpl.dir}/${v.key}.svg`).then((r) => {
          if (!r.ok) throw new Error("load");
          return r.text();
        }),
      ),
    )
      .then((texts) => {
        if (off) return;
        const out: Record<string, ViewSrc> = {};
        tpl.views.forEach((v, i) => (out[v.key] = parseView(texts[i])));
        setSrcs(out);
      })
      .catch(() => setLoadErr(true));
    return () => {
      off = true;
    };
  }, [tpl]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth || 360));
    ro.observe(el);
    setCw(el.clientWidth || 360);
    return () => ro.disconnect();
  }, [srcs]);

  const src = srcs[view];
  const layers = design.layers[view] ?? [];
  const selected = layers.find((l) => l.id === sel) ?? null;

  const commit = useCallback((fn: (d: Design) => Design) => {
    const cur = designRef.current;
    setPast((p) => [...p.slice(-60), cur]);
    setFuture([]);
    setDesign(fn(cur));
  }, []);

  const patchLive = (id: string, p: Partial<Layer>) =>
    setDesign((d) => ({
      ...d,
      layers: { ...d.layers, [view]: (d.layers[view] ?? []).map((l) => (l.id === id ? { ...l, ...p } : l)) },
    }));

  const patch = (id: string, p: Partial<Layer>) =>
    commit((d) => ({
      ...d,
      layers: { ...d.layers, [view]: (d.layers[view] ?? []).map((l) => (l.id === id ? { ...l, ...p } : l)) },
    }));

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      setFuture((f) => [designRef.current, ...f]);
      setDesign(p[p.length - 1]);
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      setPast((p) => [...p, designRef.current]);
      setDesign(f[0]);
      return f.slice(1);
    });
  }, []);

  const addLayer = (l: Omit<Layer, "id">) => {
    const id = uid();
    commit((d) => ({ ...d, layers: { ...d.layers, [view]: [...(d.layers[view] ?? []), { ...l, id }] } }));
    setSel(id);
  };

  const center = () => {
    const [x, y, w, h] = src.vb;
    return { cx: x + w / 2, cy: y + h / 2, vw: w, vh: h };
  };

  const addText = () => {
    if (!src) return;
    const { cx, cy, vw } = center();
    const h = vw * 0.07;
    const text = "YOUR TEXT";
    addLayer({
      kind: "text", cx, cy, h, w: measureText(text, "Arial Black", false, h * 0.8), rot: 0, opacity: 1,
      fill: "#111111", text, font: "Arial Black", name: "Text",
    });
  };
  const addShape = (kind: "rect" | "ellipse") => {
    if (!src) return;
    const { cx, cy, vw } = center();
    addLayer({
      kind, cx, cy, w: vw * 0.22, h: vw * 0.12, rot: 0, opacity: 1, fill: "#0b5fff",
      name: kind === "rect" ? "Rectangle" : "Ellipse",
    });
  };
  const onFile = async (f: File | undefined) => {
    if (!f || !src) return;
    setMsg("");
    try {
      const im = await readImage(f);
      const { cx, cy, vw } = center();
      const w = vw * 0.3;
      addLayer({
        kind: "image", cx, cy, w, h: (w * im.h) / im.w, rot: 0, opacity: 1, fill: "#000",
        href: im.href, name: f.name.slice(0, 24) || "Artwork",
      });
    } catch {
      setMsg("Couldn't read that file. Try a PNG, JPG or SVG.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = useCallback(() => {
    if (!sel) return;
    commit((d) => ({ ...d, layers: { ...d.layers, [view]: (d.layers[view] ?? []).filter((l) => l.id !== sel) } }));
    setSel(null);
  }, [sel, view, commit]);

  const duplicate = () => {
    if (!selected) return;
    const id = uid();
    commit((d) => ({
      ...d,
      layers: { ...d.layers, [view]: [...(d.layers[view] ?? []), { ...selected, id, cx: selected.cx + 14, cy: selected.cy + 14 }] },
    }));
    setSel(id);
  };

  const order = (dir: 1 | -1) => {
    if (!selected) return;
    commit((d) => {
      const arr = [...(d.layers[view] ?? [])];
      const i = arr.findIndex((l) => l.id === selected.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, layers: { ...d.layers, [view]: arr } };
    });
  };

  const copyToOther = () => {
    const other = view === "side-a" ? "side-b" : view === "side-b" ? "side-a" : null;
    if (!other || !src || !srcs[other]) return;
    const [ax, , aw] = src.vb;
    const [bx, , bw] = srcs[other].vb;
    commit((d) => ({
      ...d,
      layers: {
        ...d.layers,
        [other]: (d.layers[view] ?? []).map((l) => {
          const rel = (l.cx - ax) / aw;
          return { ...l, id: uid(), cx: bx + (1 - rel) * bw, rot: -l.rot };
        }),
      },
    }));
    setMsg("Copied to the other side (mirrored position).");
    setView(other);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") remove();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, remove]);

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };

  const begin = (e: React.PointerEvent, mode: Drag["mode"], l: Layer) => {
    e.stopPropagation();
    setSel(l.id);
    drag.current = { mode, id: l.id, start: toSvg(e), orig: l, before: designRef.current };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    const o = d.orig;
    if (d.mode === "move") {
      patchLive(d.id, { cx: o.cx + p.x - d.start.x, cy: o.cy + p.y - d.start.y });
    } else if (d.mode === "rot") {
      let a = (Math.atan2(p.y - o.cy, p.x - o.cx) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      patchLive(d.id, { rot: Math.round(a * 10) / 10 });
    } else {
      const r = (-o.rot * Math.PI) / 180;
      const dx = p.x - o.cx;
      const dy = p.y - o.cy;
      const lx = Math.abs(dx * Math.cos(r) - dy * Math.sin(r));
      const ly = Math.abs(dx * Math.sin(r) + dy * Math.cos(r));
      const lock = (o.kind === "image" || o.kind === "text") !== e.shiftKey;
      if (lock) {
        const k = Math.max(0.05, Math.max(lx / (o.w / 2), ly / (o.h / 2)));
        patchLive(d.id, { w: o.w * k, h: o.h * k });
      } else {
        patchLive(d.id, { w: Math.max(6, lx * 2), h: Math.max(6, ly * 2) });
      }
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && designRef.current !== d.before) {
      setPast((p) => [...p.slice(-60), d.before]);
      setFuture([]);
    }
  };

  const setText = (patchIn: Partial<Layer>) => {
    if (!selected || selected.kind !== "text") return;
    const next = { ...selected, ...patchIn };
    const size = next.h * 0.8;
    patch(selected.id, { ...patchIn, w: measureText(next.text ?? "", next.font ?? "Arial", !!next.bold, size) });
  };

  const px = src ? src.vb[2] / cw : 1;
  const inchesPerUnit = (() => {
    const s = srcs[tpl.scaleView];
    return s ? tpl.lengthIn / (s.vb[2] - 4) : 0;
  })();

  const summary = () =>
    Object.entries(design.layers)
      .filter(([, ls]) => ls.length)
      .map(([v, ls]) => `${v}: ${ls.map((l) => (l.kind === "text" ? `text "${l.text}"` : l.kind === "image" ? `image ${l.name}` : l.kind)).join(", ")}`)
      .join(" | ");

  const download = async (all: boolean) => {
    if (!src) return;
    setBusy(true);
    setMsg("");
    try {
      const keys = all ? tpl.views.map((v) => v.key) : [view];
      for (const k of keys) {
        const url = await renderView(srcs[k], design, k, 2000, "image/png", 1);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wrap-design-${k}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch {
      setMsg("Couldn't create the image. Try again.");
    }
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!src) return;
    setSent("sending");
    try {
      const withArt = tpl.views.map((v) => v.key).filter((k) => (design.layers[k] ?? []).length);
      const keys = withArt.length ? withArt : [view];
      const images: { view: string; dataUrl: string }[] = [];
      for (const k of keys) images.push({ view: k, dataUrl: await renderView(srcs[k], design, k, 1400, "image/jpeg", 0.85) });
      const res = await fetch("/api/wrap-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, vehicle: tpl.label, bodyColor: design.color, summary: summary(), images,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setSent(res.ok ? "ok" : j.error || "Something went wrong. Please call (772) 985-2854.");
    } catch {
      setSent("Something went wrong. Please call (772) 985-2854.");
    }
  };

  const sizeLabel =
    selected && inchesPerUnit
      ? `${(selected.w * inchesPerUnit).toFixed(1)}" × ${(selected.h * inchesPerUnit).toFixed(1)}"`
      : "";

  return (
    <section data-no-buddy className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6">
        <p className="font-headline text-xs uppercase tracking-widest text-[#18d3e8]">Experimental preview</p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl">Vehicle Wrap Designer</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Pick your color, drop on a logo or lettering, and see it on the truck. When you like it, request a quote and we&apos;ll
          follow up. This is a visual impression, not a production proof.
        </p>
      </div>

      {loadErr && <p className="rounded-xl border border-red-400/40 p-4 text-sm">Couldn&apos;t load the vehicle template. Please refresh.</p>}
      {!src && !loadErr && <p className="text-sm text-white/60">Loading vehicle…</p>}

      {src && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {tpl.views.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => {
                    setView(v.key);
                    setSel(null);
                  }}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
                    v.key === view ? "accent-gradient border-transparent text-black" : "border-white/15 text-white/80"
                  }`}
                >
                  {v.label}
                  {(design.layers[v.key] ?? []).length ? " •" : ""}
                </button>
              ))}
            </div>

            <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-white/10 bg-white">
              <svg
                ref={svgRef}
                viewBox={src.vb.join(" ")}
                className="block h-auto w-full select-none"
                style={{ isolation: "isolate", touchAction: sel ? "none" : "pan-y" }}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerDown={() => setSel(null)}
              >
                <rect x={src.vb[0]} y={src.vb[1]} width={src.vb[2]} height={src.vb[3]} fill="#fff" />
                <g dangerouslySetInnerHTML={{ __html: bodyMarkup(src, design.color) }} />
                <g clipPath="url(#bodyclip)">
                  {layers.map((l) => (
                    <g
                      key={l.id}
                      style={{ cursor: "move" }}
                      onPointerDown={(e) => begin(e, "move", l)}
                      dangerouslySetInnerHTML={{ __html: layerMarkup(l) }}
                    />
                  ))}
                </g>
                <g style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: src.details }} />
                {selected && (
                  <g transform={`translate(${selected.cx} ${selected.cy}) rotate(${selected.rot})`}>
                    <rect
                      x={-selected.w / 2} y={-selected.h / 2} width={selected.w} height={selected.h}
                      fill="none" stroke="#18d3e8" strokeWidth={1.5 * px} strokeDasharray={`${5 * px} ${4 * px}`}
                      style={{ pointerEvents: "none" }}
                    />
                    <line
                      x1={0} y1={-selected.h / 2} x2={0} y2={-selected.h / 2 - 26 * px}
                      stroke="#18d3e8" strokeWidth={1.5 * px} style={{ pointerEvents: "none" }}
                    />
                    <circle
                      cx={0} cy={-selected.h / 2 - 26 * px} r={9 * px} fill="#d9f000" stroke="#111" strokeWidth={1 * px}
                      style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, "rot", selected)}
                    />
                    <circle
                      cx={selected.w / 2} cy={selected.h / 2} r={9 * px} fill="#18d3e8" stroke="#111" strokeWidth={1 * px}
                      style={{ cursor: "nwse-resize" }} onPointerDown={(e) => begin(e, "scale", selected)}
                    />
                  </g>
                )}
              </svg>
            </div>
            <p className="mt-2 text-xs text-white/50">
              Tap a graphic to select it. Drag to move, blue dot to resize, yellow dot to rotate. Artwork stays on the body of the vehicle; windows, wheels and trim keep their look.
            </p>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-surface p-4">
              <p className="font-headline mb-2 text-xs uppercase tracking-widest text-white/60">Vehicle</p>
              <p className="text-sm font-semibold">{tpl.label}</p>
              <p className="mt-1 text-xs text-white/50">More vehicles coming soon.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface p-4">
              <p className="font-headline mb-2 text-xs uppercase tracking-widest text-white/60">Body color</p>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c} type="button" aria-label={`Color ${c}`}
                    onClick={() => commit((d) => ({ ...d, color: c }))}
                    className={`h-8 w-8 rounded-full border-2 ${design.color === c ? "border-[#d9f000]" : "border-white/20"}`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color" aria-label="Custom body color" value={design.color}
                  onChange={(e) => commit((d) => ({ ...d, color: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded bg-transparent"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface p-4">
              <p className="font-headline mb-2 text-xs uppercase tracking-widest text-white/60">Add to design</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Upload logo</button>
                <button type="button" className={btn} onClick={addText}>Add text</button>
                <button type="button" className={btn} onClick={() => addShape("rect")}>Rectangle</button>
                <button type="button" className={btn} onClick={() => addShape("ellipse")}>Ellipse</button>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="mt-2 flex gap-2">
                <button type="button" className={btn} onClick={undo} disabled={!past.length}>Undo</button>
                <button type="button" className={btn} onClick={redo} disabled={!future.length}>Redo</button>
                {(view === "side-a" || view === "side-b") && (
                  <button type="button" className={btn} onClick={copyToOther} disabled={!layers.length}>Copy to other side</button>
                )}
              </div>
              {msg && <p className="mt-2 text-xs text-[#d9f000]">{msg}</p>}
            </div>

            {selected && (
              <div className="space-y-3 rounded-2xl border border-[#18d3e8]/40 bg-surface p-4">
                <p className="font-headline text-xs uppercase tracking-widest text-[#18d3e8]">
                  Selected: {selected.name} {sizeLabel && <span className="text-white/50">({sizeLabel})</span>}
                </p>
                {selected.kind === "text" && (
                  <>
                    <input
                      value={selected.text ?? ""} onChange={(e) => setText({ text: e.target.value })}
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" aria-label="Text"
                    />
                    <div className="flex gap-2">
                      <select
                        value={selected.font} onChange={(e) => setText({ font: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm" aria-label="Font"
                      >
                        {FONTS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                      <button type="button" className={btn} onClick={() => setText({ bold: !selected.bold })}>{selected.bold ? "Bold ✓" : "Bold"}</button>
                    </div>
                  </>
                )}
                {selected.kind !== "image" && (
                  <label className="flex items-center gap-3 text-xs text-white/70">
                    Color
                    <input type="color" value={selected.fill} onChange={(e) => patch(selected.id, { fill: e.target.value })} className="h-8 w-12 cursor-pointer rounded bg-transparent" />
                  </label>
                )}
                <label className="block text-xs text-white/70">
                  Opacity {Math.round(selected.opacity * 100)}%
                  <input
                    type="range" min={10} max={100} value={Math.round(selected.opacity * 100)}
                    onChange={(e) => patch(selected.id, { opacity: Number(e.target.value) / 100 })} className="w-full"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => order(1)}>Bring forward</button>
                  <button type="button" className={btn} onClick={() => order(-1)}>Send back</button>
                  <button type="button" className={btn} onClick={duplicate}>Duplicate</button>
                  <button type="button" className={btn} onClick={remove}>Delete</button>
                </div>
              </div>
            )}

            {layers.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-surface p-4">
                <p className="font-headline mb-2 text-xs uppercase tracking-widest text-white/60">Layers (this view)</p>
                <ul className="space-y-1">
                  {[...layers].reverse().map((l) => (
                    <li key={l.id}>
                      <button
                        type="button" onClick={() => setSel(l.id)}
                        className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-xs ${l.id === sel ? "bg-[#18d3e8]/20" : "bg-white/5"}`}
                      >
                        {l.kind === "text" ? `Text: ${l.text}` : l.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-surface p-4">
              <p className="font-headline mb-2 text-xs uppercase tracking-widest text-white/60">Save a copy</p>
              <div className="flex gap-2">
                <button type="button" className={btn} disabled={busy} onClick={() => download(false)}>PNG (this view)</button>
                <button type="button" className={btn} disabled={busy} onClick={() => download(true)}>All views</button>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[#d9f000]/40 bg-surface p-4">
              <p className="font-headline text-xs uppercase tracking-widest text-[#d9f000]">Request a quote with this design</p>
              {sent === "ok" ? (
                <p className="text-sm text-[#d9f000]">Thanks! We got your design and will be in touch soon.</p>
              ) : (
                <>
                  {(["name", "email", "phone"] as const).map((k) => (
                    <input
                      key={k} required={k !== "phone"} type={k === "email" ? "email" : "text"}
                      placeholder={k === "name" ? "Your name" : k === "email" ? "Email" : "Phone (optional)"}
                      value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                    />
                  ))}
                  <textarea
                    placeholder="Anything we should know? (full wrap, partial, lettering, deadline…)" rows={3} value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                  <button type="submit" disabled={sent === "sending"} className="accent-gradient w-full rounded-full px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">
                    {sent === "sending" ? "Sending…" : "Send my design"}
                  </button>
                  {sent && sent !== "sending" && <p className="text-xs text-red-300">{sent}</p>}
                  <p className="text-[11px] text-white/40">Or call <a href="tel:+17729852854" className="underline">(772) 985-2854</a>.</p>
                </>
              )}
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}
