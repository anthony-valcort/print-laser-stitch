"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INCHES_PER_UNIT, type WrapTemplate } from "@/lib/wrap-templates";
import {
  FONTS,
  SHAPES,
  SWATCHES,
  CSS_TOGGLES,
  bodyMarkup,
  computeCoverage,
  downloadUrl,
  fmtLen,
  fromIn,
  ftIn,
  jpegToPdf,
  layerBox,
  layerMarkup,
  measureText,
  newLayer,
  readImage,
  renderSheet,
  solid,
  tplViewFor,
  toIn,
  uid,
  type Design,
  type FillKind,
  type Layer,
  type SheetSrc,
  type ShapeKind,
} from "./wrap-model";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Gesture =
  | { mode: "pan"; sx: number; sy: number; x0: number; y0: number; moved: boolean }
  | { mode: "pinch"; d0: number; k0: number }
  | { mode: "move" | "scale" | "rot"; id: string; start: { x: number; y: number }; orig: Layer; before: Design; handle: Handle | "" };

type Props = {
  tpl: WrapTemplate;
  src: SheetSrc;
  initial: Design;
  onChange: (d: Design) => void;
  onContinue: () => void;
  onChangeVehicle: () => void;
  onSave: () => void;
  onOpenDesigns: () => void;
  onFeedback: () => void;
};

const HANDLES: { id: Handle; x: number; y: number }[] = [
  { id: "nw", x: -1, y: -1 },
  { id: "n", x: 0, y: -1 },
  { id: "ne", x: 1, y: -1 },
  { id: "e", x: 1, y: 0 },
  { id: "se", x: 1, y: 1 },
  { id: "s", x: 0, y: 1 },
  { id: "sw", x: -1, y: 1 },
  { id: "w", x: -1, y: 0 },
];

const tb =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-semibold text-white transition hover:border-[#18d3e8]/60 disabled:cursor-not-allowed disabled:opacity-35";
const tbOn = "border-[#d9f000]/70 bg-[#d9f000]/15 text-[#d9f000]";
const inp = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white";

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 py-3">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left font-headline text-xs uppercase tracking-widest text-white/80">
        {title}
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

export default function WrapEditor({ tpl, src, initial, onChange, onContinue, onChangeVehicle, onSave, onOpenDesigns, onFeedback }: Props) {
  const [design, setDesign] = useState<Design>(initial);
  const [past, setPast] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [guides, setGuides] = useState(true);
  const [rulers, setRulers] = useState(false);
  const [lines, setLines] = useState(true);
  const [labels, setLabels] = useState(true);
  const [keep, setKeep] = useState(true);
  const [hand, setHand] = useState(false);
  const [tab, setTab] = useState<"edit" | "layers">("edit");
  const [cm, setCm] = useState(false);
  const [open, setOpen] = useState({ shape: true, fill: true, stroke: false, effects: false, transform: false });
  const [shapesOpen, setShapesOpen] = useState(false);
  const [vt, setVt] = useState({ x: src.vb[0], y: src.vb[1], k: 1 });
  const [size, setSize] = useState({ cw: 800, ch: 520 });
  const [snapLines, setSnapLines] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
  const [cov, setCov] = useState<{ sqft: number; pct: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newColor, setNewColor] = useState("#ff76b4");

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const designRef = useRef(design);
  designRef.current = design;
  const vtRef = useRef(vt);
  vtRef.current = vt;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const userZoomed = useRef(false);
  const co = useRef({ key: "", t: 0 });

  const [vx0, vy0, vw, vh] = src.vb;

  const fitFor = useCallback(
    (cw: number, ch: number) => {
      const k = Math.min(cw / vw, ch / vh) * 0.97;
      return { k, x: vx0 + vw / 2 - cw / k / 2, y: vy0 + vh / 2 - ch / k / 2 };
    },
    [vx0, vy0, vw, vh],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth || 800;
      const ch = Math.max(300, Math.min(720, Math.round(cw / 1.5)));
      setSize({ cw, ch });
      if (!userZoomed.current) setVt(fitFor(cw, ch));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [fitFor]);

  useEffect(() => {
    onChange(design);
  }, [design, onChange]);

  const layers = design.layers;
  const selected = layers.find((l) => l.id === sel) ?? null;
  const kFit = fitFor(size.cw, size.ch).k;

  /* ---------- history ---------- */
  const commit = useCallback((next: Design, key = "") => {
    const cur = designRef.current;
    const now = Date.now();
    const coalesce = key && co.current.key === key && now - co.current.t < 900;
    co.current = { key, t: now };
    if (!coalesce) setPast((p) => [...p.slice(-80), cur]);
    setFuture([]);
    setDesign(next);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      setFuture((f) => [designRef.current, ...f]);
      setDesign(p[p.length - 1]);
      co.current = { key: "", t: 0 };
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      setPast((p) => [...p, designRef.current]);
      setDesign(f[0]);
      co.current = { key: "", t: 0 };
      return f.slice(1);
    });
  }, []);

  const mapLayers = (fn: (l: Layer) => Layer, ids?: string[]) => ({
    ...designRef.current,
    layers: designRef.current.layers.map((l) => (!ids || ids.includes(l.id) ? fn(l) : l)),
  });
  const patch = (id: string, p: Partial<Layer>, key = "") => commit(mapLayers((l) => ({ ...l, ...p }), [id]), key ? `${id}:${key}` : "");
  const patchLive = (id: string, p: Partial<Layer>) => setDesign((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) }));

  /* ---------- helpers ---------- */
  const viewportCenter = () => ({ x: vt.x + size.cw / vt.k / 2, y: vt.y + size.ch / vt.k / 2 });

  const addLayer = (l: Layer) => {
    commit({ ...designRef.current, layers: [...designRef.current.layers, l] });
    setSel(l.id);
    setTab("edit");
  };

  const spot = () => {
    const c = viewportCenter();
    const v = tplViewFor(tpl, c.x, c.y);
    return { v, cx: v.x + v.w / 2, cy: v.y + v.h / 2 };
  };

  const addText = () => {
    const { v, cx, cy } = spot();
    const h = Math.min(v.w, v.h) * 0.14;
    const text = "YOUR TEXT";
    addLayer(
      newLayer({
        type: "text", name: "Text", cx, cy, h, w: measureText(text, "Arial Black", false, false, h * 0.8), text,
        fill: solid(newColor),
      }),
    );
  };

  const addShape = (kind: ShapeKind) => {
    const { v, cx, cy } = spot();
    const base = Math.min(v.w, v.h) * 0.4;
    const isLine = kind === "line";
    addLayer(
      newLayer({
        type: "shape", shape: kind, name: SHAPES.find((s) => s.kind === kind)?.label ?? "Shape", cx, cy,
        w: isLine ? v.w * 0.5 : base * (kind === "rect" || kind === "rounded" ? 1.5 : 1.2), h: isLine ? 12 : base,
        fill: solid(newColor), sw: isLine ? 6 : 0,
      }),
    );
    setShapesOpen(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMsg("");
    try {
      const im = await readImage(f);
      const { v, cx, cy } = spot();
      const w = Math.min(v.w * 0.35, 320);
      addLayer(newLayer({ type: "image", name: f.name.slice(0, 28) || "Artwork", cx, cy, w, h: (w * im.h) / im.w, href: im.href }));
    } catch {
      setMsg("Couldn't read that file. Try a PNG, JPG, WebP or SVG.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = useCallback(() => {
    const s = designRef.current.layers.find((l) => l.id === sel);
    if (!s || s.locked) return;
    commit({ ...designRef.current, layers: designRef.current.layers.filter((l) => l.id !== sel) });
    setSel(null);
  }, [sel, commit]);

  const duplicate = useCallback(() => {
    const s = designRef.current.layers.find((l) => l.id === sel);
    if (!s) return;
    const id = uid();
    commit({ ...designRef.current, layers: [...designRef.current.layers, { ...s, id, name: `${s.name} copy`, cx: s.cx + 12, cy: s.cy + 12, locked: false }] });
    setSel(id);
  }, [sel, commit]);

  const order = (dir: 1 | -1) => {
    if (!selected) return;
    const arr = [...layers];
    const i = arr.findIndex((l) => l.id === selected.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    commit({ ...design, layers: arr });
  };

  const align = (how: "l" | "c" | "r" | "t" | "m" | "b") => {
    if (!selected || selected.locked) return;
    const v = tplViewFor(tpl, selected.cx, selected.cy);
    const b = layerBox(selected);
    let dx = 0;
    let dy = 0;
    if (how === "l") dx = v.x - b.x0;
    if (how === "c") dx = v.x + v.w / 2 - (b.x0 + b.x1) / 2;
    if (how === "r") dx = v.x + v.w - b.x1;
    if (how === "t") dy = v.y - b.y0;
    if (how === "m") dy = v.y + v.h / 2 - (b.y0 + b.y1) / 2;
    if (how === "b") dy = v.y + v.h - b.y1;
    patch(selected.id, { cx: selected.cx + dx, cy: selected.cy + dy });
  };

  const setText = (p: Partial<Layer>) => {
    if (!selected || selected.type !== "text") return;
    const n = { ...selected, ...p };
    patch(selected.id, { ...p, w: measureText(n.text, n.font, n.bold, n.italic, n.h * 0.8) }, "text");
  };

  const setSizeIn = (dim: "w" | "h", val: number) => {
    if (!selected || selected.locked || !isFinite(val) || val <= 0) return;
    const units = fromIn(cm ? val / 2.54 : val);
    if (selected.lockAspect && selected.type !== "shape") {
      const k = units / (dim === "w" ? selected.w : selected.h);
      patch(selected.id, { w: selected.w * k, h: selected.h * k }, "size");
    } else patch(selected.id, { [dim]: Math.max(2, units) } as Partial<Layer>, "size");
  };

  const toggleLock = () => selected && patch(selected.id, { locked: !selected.locked });

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && k === "y") {
        e.preventDefault();
        redo();
      } else if (mod && k === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (sel) {
          e.preventDefault();
          remove();
        }
      } else if (e.key.startsWith("Arrow") && sel) {
        const s = designRef.current.layers.find((l) => l.id === sel);
        if (!s || s.locked) return;
        e.preventDefault();
        const st = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0;
        const dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
        commit(mapLayers((l) => ({ ...l, cx: l.cx + dx, cy: l.cy + dy }), [sel]), `${sel}:nudge`);
      } else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, duplicate, remove, sel, commit]);

  /* ---------- zoom / pan ---------- */
  const zoomAt = useCallback(
    (factor: number, sx: number, sy: number) => {
      userZoomed.current = true;
      setVt((cur) => {
        const k = Math.min(kFit * 60, Math.max(kFit * 0.4, cur.k * factor));
        const wx = cur.x + sx / cur.k;
        const wy = cur.y + sy / cur.k;
        return { k, x: wx - sx / k, y: wy - sy / k };
      });
    },
    [kFit],
  );

  const fit = () => {
    userZoomed.current = false;
    setVt(fitFor(size.cw, size.ch));
  };
  const oneToOne = () => {
    userZoomed.current = true;
    const c = viewportCenter();
    setVt({ k: 1, x: c.x - size.cw / 2, y: c.y - size.ch / 2 });
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* ---------- pointer interaction ---------- */
  const toSheet = (cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    const v = vtRef.current;
    return { x: v.x + (cx - (r?.left ?? 0)) / v.k, y: v.y + (cy - (r?.top ?? 0)) / v.k };
  };

  const onDownCapture = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      gesture.current = { mode: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: vtRef.current.k };
    }
  };

  const startPan = (e: React.PointerEvent) => {
    gesture.current = { mode: "pan", sx: e.clientX, sy: e.clientY, x0: vtRef.current.x, y0: vtRef.current.y, moved: false };
  };

  const onBgDown = (e: React.PointerEvent) => {
    if (pointers.current.size > 1) return;
    startPan(e);
  };

  const begin = (e: React.PointerEvent, mode: "move" | "scale" | "rot", l: Layer, handle: Handle | "" = "") => {
    if (pointers.current.size > 1) return;
    e.stopPropagation();
    setSel(l.id);
    if (hand && mode === "move") {
      startPan(e);
      return;
    }
    if (l.locked) {
      gesture.current = null;
      return;
    }
    const p = toSheet(e.clientX, e.clientY);
    gesture.current = { mode, id: l.id, start: p, orig: l, before: designRef.current, handle };
  };

  const snapMove = (o: Layer, dx: number, dy: number) => {
    const thr = 8 / vtRef.current.k;
    const b = layerBox({ ...o, cx: o.cx + dx, cy: o.cy + dy });
    const tx: number[] = [];
    const ty: number[] = [];
    for (const v of tpl.views) {
      tx.push(v.x, v.x + v.w / 2, v.x + v.w);
      ty.push(v.y, v.y + v.h / 2, v.y + v.h);
    }
    for (const l of designRef.current.layers) {
      if (l.id === o.id || l.hidden) continue;
      const lb = layerBox(l);
      tx.push(lb.x0, (lb.x0 + lb.x1) / 2, lb.x1);
      ty.push(lb.y0, (lb.y0 + lb.y1) / 2, lb.y1);
    }
    const best = (pts: number[], targets: number[]) => {
      let bd = thr;
      let off = 0;
      let line: number | null = null;
      for (const p of pts) for (const t of targets) {
        const d = t - p;
        if (Math.abs(d) < bd) {
          bd = Math.abs(d);
          off = d;
          line = t;
        }
      }
      return { off, line };
    };
    const sx = best([b.x0, (b.x0 + b.x1) / 2, b.x1], tx);
    const sy = best([b.y0, (b.y0 + b.y1) / 2, b.y1], ty);
    return { dx: dx + sx.off, dy: dy + sy.off, xs: sx.line === null ? [] : [sx.line], ys: sy.line === null ? [] : [sy.line] };
  };

  const onMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = Array.from(pointers.current.values());
      const r = svgRef.current?.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - (r?.left ?? 0);
      const my = (a.y + b.y) / 2 - (r?.top ?? 0);
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      userZoomed.current = true;
      const k = Math.min(kFit * 60, Math.max(kFit * 0.4, (g.k0 * d) / g.d0));
      setVt((cur) => {
        const wx = cur.x + mx / cur.k;
        const wy = cur.y + my / cur.k;
        return { k, x: wx - mx / k, y: wy - my / k };
      });
      return;
    }
    if (g.mode === "pan") {
      const dx = e.clientX - g.sx;
      const dy = e.clientY - g.sy;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      userZoomed.current = true;
      const k = vtRef.current.k;
      setVt({ k, x: g.x0 - dx / k, y: g.y0 - dy / k });
      return;
    }
    const p = toSheet(e.clientX, e.clientY);
    const o = g.orig;
    if (g.mode === "move") {
      let dx = p.x - g.start.x;
      let dy = p.y - g.start.y;
      if (guides) {
        const s = snapMove(o, dx, dy);
        dx = s.dx;
        dy = s.dy;
        setSnapLines({ xs: s.xs, ys: s.ys });
      }
      patchLive(g.id, { cx: o.cx + dx, cy: o.cy + dy });
    } else if (g.mode === "rot") {
      let a = (Math.atan2(p.y - o.cy, p.x - o.cx) * 180) / Math.PI + 90;
      a = ((a % 360) + 360) % 360;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      else for (const t of [0, 90, 180, 270, 360]) if (Math.abs(a - t) < 3) a = t % 360;
      patchLive(g.id, { rot: Math.round(a * 10) / 10 });
    } else {
      const r = (o.rot * Math.PI) / 180;
      const cos = Math.cos(r);
      const sin = Math.sin(r);
      const dx = p.x - o.cx;
      const dy = p.y - o.cy;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const hx = g.handle.includes("e") ? 1 : g.handle.includes("w") ? -1 : 0;
      const hy = g.handle.includes("s") ? 1 : g.handle.includes("n") ? -1 : 0;
      let w = o.w;
      let h = o.h;
      if (hx) w = Math.max(4, (lx + (hx * o.w) / 2) * hx);
      if (hy && !(o.type === "shape" && o.shape === "line")) h = Math.max(4, (ly + (hy * o.h) / 2) * hy);
      if (hx && hy && (o.lockAspect !== e.shiftKey)) {
        const k = Math.max(w / o.w, h / o.h);
        w = o.w * k;
        h = o.h * k;
      }
      const ccx = hx ? (hx * (w - o.w)) / 2 : 0;
      const ccy = hy ? (hy * (h - o.h)) / 2 : 0;
      patchLive(g.id, { w, h, cx: o.cx + ccx * cos - ccy * sin, cy: o.cy + ccx * sin + ccy * cos });
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      gesture.current = null;
      setSnapLines({ xs: [], ys: [] });
      if (g && g.mode === "pan" && !g.moved) setSel(null);
      if (g && (g.mode === "move" || g.mode === "scale" || g.mode === "rot") && designRef.current !== g.before) {
        setPast((p) => [...p.slice(-80), g.before]);
        setFuture([]);
        co.current = { key: "", t: 0 };
      }
    } else if (g && g.mode === "pinch") gesture.current = null;
  };

  /* ---------- derived markup ---------- */
  const bodyStr = useMemo(() => bodyMarkup(src, design.color), [src, design.color]);

  /* ---------- coverage ---------- */
  useEffect(() => {
    if (!layers.some((l) => !l.hidden)) {
      setCov({ sqft: 0, pct: 0 });
      return;
    }
    let off = false;
    const t = setTimeout(() => {
      computeCoverage(src, designRef.current)
        .then((c) => !off && setCov({ sqft: c.sqft, pct: c.pct }))
        .catch(() => undefined);
    }, 500);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [layers, src]);

  /* ---------- exports ---------- */
  const exportPng = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await renderSheet(src, design, { width: 3600, keepOnBody: keep, lines, labels }, "image/png");
      downloadUrl(r.dataUrl, `wrap-design-${tpl.id}.png`);
    } catch {
      setMsg("Couldn't create the PNG. Try again.");
    }
    setBusy(false);
  };
  const exportPdf = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await renderSheet(src, design, { width: 3000, keepOnBody: keep, lines, labels }, "image/jpeg", 0.92);
      const blob = jpegToPdf(r.dataUrl, r.width, r.height, Math.round(vw), Math.round(vh));
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `wrap-design-${tpl.id}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setMsg("Couldn't create the PDF. Try again.");
    }
    setBusy(false);
  };

  /* ---------- rulers ---------- */
  const rulerTicks = (axis: "x" | "y") => {
    const k = vt.k;
    const origin = axis === "x" ? vx0 : vy0;
    const startU = axis === "x" ? vt.x : vt.y;
    const lenPx = axis === "x" ? size.cw : size.ch;
    const steps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const stepIn = steps.find((s) => s / INCHES_PER_UNIT * k >= 56) ?? 1000;
    const minor = stepIn / 5;
    const out: { pos: number; major: boolean; label: string }[] = [];
    const fromIn0 = Math.floor(((startU - origin) * INCHES_PER_UNIT) / minor) * minor;
    const toIn0 = ((startU - origin) + lenPx / k) * INCHES_PER_UNIT;
    for (let v = fromIn0; v <= toIn0 + minor; v += minor) {
      const u = origin + v / INCHES_PER_UNIT;
      const pos = (u - startU) * k;
      const major = Math.abs(v / stepIn - Math.round(v / stepIn)) < 1e-6;
      out.push({ pos, major, label: major ? `${Math.round(v * 10) / 10}"` : "" });
    }
    return out;
  };

  const px = 1 / vt.k;
  const zoomPct = Math.round((vt.k / kFit) * 100);
  const selBox = selected;

  /* ---------- UI ---------- */
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">Design your wrap</h2>
          <p className="text-sm text-white/65">Upload artwork, add text, and position it on the vehicle template.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="accent-gradient inline-flex h-10 items-center rounded-lg px-4 text-xs font-bold text-black" onClick={() => fileRef.current?.click()}>
            Upload artwork
          </button>
          <button type="button" className={tb + " h-10"} onClick={onOpenDesigns}>My designs</button>
          <button type="button" className={tb + " h-10"} onClick={onSave}>Save</button>
          <button type="button" className={tb + " h-10"} onClick={onFeedback}>Feedback</button>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {/* toolbar */}
      <div className="mb-3 rounded-2xl border border-white/10 bg-surface p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={tb} onClick={addText} title="Add text">T&nbsp;Text</button>
          <div className="relative">
            <button type="button" className={tb} onClick={() => setShapesOpen((v) => !v)} aria-expanded={shapesOpen}>◧&nbsp;Shapes&nbsp;▾</button>
            {shapesOpen && (
              <div className="absolute left-0 top-10 z-30 w-52 rounded-xl border border-white/15 bg-[#14141c] p-1 shadow-xl">
                {SHAPES.map((s) => (
                  <button key={s.kind} type="button" onClick={() => addShape(s.kind)} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className={tb + " cursor-pointer"} title="Body color (paint)">
            Body
            <input type="color" value={design.color} onChange={(e) => commit({ ...design, color: e.target.value }, "body")} className="h-6 w-7 cursor-pointer rounded bg-transparent" aria-label="Body color" />
          </label>
          <label className={tb + " cursor-pointer"} title={selected ? "Fill color of selection" : "Color for the next shape or text"}>
            Fill
            <input
              type="color"
              value={selected ? selected.fill.c1 : newColor}
              onChange={(e) => {
                if (selected && selected.type !== "image") patch(selected.id, { fill: { ...selected.fill, c1: e.target.value } }, "fill");
                else setNewColor(e.target.value);
              }}
              className="h-6 w-7 cursor-pointer rounded bg-transparent" aria-label="Fill color"
            />
          </label>
          <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" />
          <button type="button" className={tb} onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
          <button type="button" className={tb} onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
          <button type="button" className={tb} onClick={duplicate} disabled={!selected} title="Duplicate (Ctrl+D)">⧉ <span className="hidden sm:inline">Duplicate</span></button>
          <button type="button" className={tb} disabled={!selected || selected.locked} onClick={() => selected && patch(selected.id, { flipX: !selected.flipX })} title="Flip horizontally">⇋</button>
          <button type="button" className={tb} disabled={!selected || selected.locked} onClick={() => selected && patch(selected.id, { flipY: !selected.flipY })} title="Flip vertically">⇅</button>
          <button type="button" className={tb} disabled={!selected || selected.locked} onClick={() => selected && patch(selected.id, { rot: (selected.rot + 270) % 360 })} title="Rotate 90° left">⟲</button>
          <button type="button" className={tb} disabled={!selected || selected.locked} onClick={() => selected && patch(selected.id, { rot: (selected.rot + 90) % 360 })} title="Rotate 90° right">⟳</button>
          <button type="button" className={tb} disabled={!selected} onClick={() => order(1)} title="Bring forward">Forward</button>
          <button type="button" className={tb} disabled={!selected} onClick={() => order(-1)} title="Send backward">Back</button>
          <button type="button" className={tb} disabled={!selected || selected.locked} onClick={remove} title="Delete (Del)">Delete</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
          <button type="button" className={`${tb} ${guides ? tbOn : ""}`} onClick={() => setGuides((v) => !v)} aria-pressed={guides}>Guides</button>
          <button type="button" className={`${tb} ${rulers ? tbOn : ""}`} onClick={() => setRulers((v) => !v)} aria-pressed={rulers}>Rulers</button>
          <button type="button" className={`${tb} ${lines ? tbOn : ""}`} onClick={() => setLines((v) => !v)} aria-pressed={lines}>Body lines</button>
          <button type="button" className={`${tb} ${labels ? tbOn : ""}`} onClick={() => setLabels((v) => !v)} aria-pressed={labels}>Labels</button>
          <button type="button" className={`${tb} ${keep ? tbOn : ""}`} onClick={() => setKeep((v) => !v)} aria-pressed={keep} title="Clip artwork to the vehicle body">Keep on body</button>
          <button type="button" className={`${tb} ${selected?.locked ? tbOn : ""}`} onClick={toggleLock} disabled={!selected} aria-pressed={!!selected?.locked}>Lock</button>
          <button type="button" className={`${tb} ${hand ? tbOn : ""}`} onClick={() => setHand((v) => !v)} aria-pressed={hand} title="Hand tool: drag to pan, even over artwork">✋</button>
          <span className="ml-auto flex items-center gap-1.5">
            <button type="button" className={tb} onClick={() => zoomAt(1 / 1.25, size.cw / 2, size.ch / 2)} aria-label="Zoom out">−</button>
            <span className="w-12 text-center text-xs font-semibold">{zoomPct}%</span>
            <button type="button" className={tb} onClick={() => zoomAt(1.25, size.cw / 2, size.ch / 2)} aria-label="Zoom in">+</button>
            <button type="button" className={tb} onClick={fit}>Fit</button>
            <button type="button" className={tb} onClick={oneToOne} title="One sheet unit per screen pixel">1:1</button>
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* side panel */}
        <aside className="order-2 rounded-2xl border border-white/10 bg-surface p-3 lg:order-1">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 text-xs font-bold uppercase tracking-wider">
            <button type="button" onClick={() => setTab("edit")} className={`rounded-lg py-2 ${tab === "edit" ? "accent-gradient text-black" : "text-white/70"}`}>Edit</button>
            <button type="button" onClick={() => setTab("layers")} className={`rounded-lg py-2 ${tab === "layers" ? "accent-gradient text-black" : "text-white/70"}`}>
              Layers {layers.length > 0 && <span className="ml-1 rounded-full bg-black/40 px-1.5 text-[10px] text-white">{layers.length}</span>}
            </button>
          </div>

          {tab === "layers" && (
            <ul className="mt-3 space-y-1">
              {layers.length === 0 && <li className="p-3 text-sm text-white/50">No layers yet. Upload artwork or add text and shapes.</li>}
              {[...layers].reverse().map((l) => (
                <li key={l.id} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs ${l.id === sel ? "bg-[#18d3e8]/20" : "bg-white/5"}`}>
                  <button type="button" aria-label={l.hidden ? "Show layer" : "Hide layer"} onClick={() => patch(l.id, { hidden: !l.hidden })} className="w-6 text-white/70">{l.hidden ? "◌" : "●"}</button>
                  <button type="button" onClick={() => setSel(l.id)} className="min-w-0 flex-1 truncate text-left">
                    <span className="mr-1 text-white/40">{l.type === "text" ? "T" : l.type === "image" ? "▣" : "◇"}</span>
                    {l.type === "text" ? l.text || "Text" : l.name}
                  </button>
                  <button type="button" aria-label={l.locked ? "Unlock layer" : "Lock layer"} onClick={() => patch(l.id, { locked: !l.locked })} className={`w-6 ${l.locked ? "text-[#d9f000]" : "text-white/40"}`}>{l.locked ? "🔒" : "🔓"}</button>
                </li>
              ))}
            </ul>
          )}

          {tab === "edit" && !selected && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-white/65">Select a graphic on the template to edit it, or add something new with the toolbar.</p>
              <div>
                <p className="mb-2 font-headline text-xs uppercase tracking-widest text-white/60">Body color</p>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={`Body color ${c}`} onClick={() => commit({ ...design, color: c })} className={`h-8 w-8 rounded-full border-2 ${design.color === c ? "border-[#d9f000]" : "border-white/20"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/45">Tips: Ctrl + scroll to zoom, drag empty space to pan, pinch on a phone. Arrow keys nudge the selection.</p>
            </div>
          )}

          {tab === "edit" && selected && (
            <div className="mt-4">
              <p className="font-headline mb-2 text-xs uppercase tracking-widest text-white/60">Properties</p>
              <div className="rounded-xl border border-[#d94cb3]/30 bg-[#d94cb3]/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-headline text-xs uppercase tracking-widest text-[#d94cb3]">Real size</span>
                  <span className="inline-flex rounded-full bg-black/30 p-0.5 text-[11px] font-bold">
                    <button type="button" onClick={() => setCm(false)} className={`rounded-full px-3 py-1 ${!cm ? "bg-[#d94cb3] text-white" : "text-white/60"}`}>IN</button>
                    <button type="button" onClick={() => setCm(true)} className={`rounded-full px-3 py-1 ${cm ? "bg-[#d94cb3] text-white" : "text-white/60"}`}>CM</button>
                  </span>
                </div>
                {(["w", "h"] as const).map((d) => {
                  const inches = toIn(selected[d]);
                  return (
                    <label key={d} className="mb-1.5 flex items-center gap-2 text-sm">
                      <span className="w-5 font-bold text-white/60">{d.toUpperCase()}</span>
                      <input
                        type="number" step="0.1" min="0.1"
                        value={Number((cm ? inches * 2.54 : inches).toFixed(1))}
                        onChange={(e) => setSizeIn(d, parseFloat(e.target.value))}
                        disabled={selected.locked}
                        className="w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-right text-sm"
                        aria-label={d === "w" ? "Width" : "Height"}
                      />
                      <span className="text-xs text-white/55">{cm ? "cm" : "in"} {!cm && `(${ftIn(inches)})`}</span>
                    </label>
                  );
                })}
                <p className="mt-1 text-[11px] italic text-white/55">at 1:20 scale (measurements verified)</p>
              </div>

              <Section title={selected.type === "text" ? "Text" : selected.type === "image" ? "Artwork" : "Shape"} open={open.shape} onToggle={() => setOpen({ ...open, shape: !open.shape })}>
                {selected.type === "text" && (
                  <>
                    <input value={selected.text} onChange={(e) => setText({ text: e.target.value })} className={inp} aria-label="Text" />
                    <div className="flex gap-2">
                      <select value={selected.font} onChange={(e) => setText({ font: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-sm" aria-label="Font">
                        {FONTS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                      <button type="button" className={`${tb} ${selected.bold ? tbOn : ""}`} onClick={() => setText({ bold: !selected.bold })}><b>B</b></button>
                      <button type="button" className={`${tb} ${selected.italic ? tbOn : ""}`} onClick={() => setText({ italic: !selected.italic })}><i>I</i></button>
                    </div>
                  </>
                )}
                {selected.type === "shape" && (
                  <select value={selected.shape} onChange={(e) => patch(selected.id, { shape: e.target.value as ShapeKind })} className={inp} aria-label="Shape">
                    {SHAPES.map((s) => <option key={s.kind} value={s.kind}>{s.label}</option>)}
                  </select>
                )}
                {selected.type === "image" && <p className="truncate text-xs text-white/60">{selected.name}</p>}
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input type="checkbox" checked={selected.lockAspect} onChange={(e) => patch(selected.id, { lockAspect: e.target.checked })} />
                  Keep proportions when resizing
                </label>
              </Section>

              {selected.type !== "image" && (
                <Section title="Fill" open={open.fill} onToggle={() => setOpen({ ...open, fill: !open.fill })}>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-1 text-xs font-semibold">
                    {(["solid", "linear", "radial"] as FillKind[]).map((k) => (
                      <button key={k} type="button" onClick={() => patch(selected.id, { fill: { ...selected.fill, kind: k } })} className={`rounded-md py-1.5 capitalize ${selected.fill.kind === k ? "bg-white text-black" : "text-white/70"}`}>{k}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selected.fill.c1} onChange={(e) => patch(selected.id, { fill: { ...selected.fill, c1: e.target.value } }, "fill")} className="h-9 w-12 cursor-pointer rounded bg-transparent" aria-label="Fill color" />
                    <span className="font-mono text-xs uppercase text-white/70">{selected.fill.c1}</span>
                    {selected.fill.kind !== "solid" && (
                      <>
                        <input type="color" value={selected.fill.c2} onChange={(e) => patch(selected.id, { fill: { ...selected.fill, c2: e.target.value } }, "fill2")} className="ml-2 h-9 w-12 cursor-pointer rounded bg-transparent" aria-label="Second fill color" />
                        <span className="font-mono text-xs uppercase text-white/70">{selected.fill.c2}</span>
                      </>
                    )}
                  </div>
                  {selected.fill.kind === "linear" && (
                    <label className="block text-xs text-white/70">
                      Angle {Math.round(selected.fill.angle)}°
                      <input type="range" min={0} max={360} value={selected.fill.angle} onChange={(e) => patch(selected.id, { fill: { ...selected.fill, angle: Number(e.target.value) } }, "angle")} className="w-full" />
                    </label>
                  )}
                </Section>
              )}

              {selected.type !== "image" && (
                <Section title="Stroke" open={open.stroke} onToggle={() => setOpen({ ...open, stroke: !open.stroke })}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selected.stroke} onChange={(e) => patch(selected.id, { stroke: e.target.value }, "stroke")} className="h-9 w-12 cursor-pointer rounded bg-transparent" aria-label="Stroke color" />
                    <span className="font-mono text-xs uppercase text-white/70">{selected.stroke}</span>
                  </div>
                  <label className="block text-xs text-white/70">
                    Stroke width {selected.sw}px
                    <input type="range" min={0} max={30} value={selected.sw} onChange={(e) => patch(selected.id, { sw: Number(e.target.value) }, "sw")} className="w-full" />
                  </label>
                </Section>
              )}

              <Section title="Effects" open={open.effects} onToggle={() => setOpen({ ...open, effects: !open.effects })}>
                <label className="block text-xs text-white/70">
                  Opacity {Math.round(selected.opacity * 100)}%
                  <input type="range" min={5} max={100} value={Math.round(selected.opacity * 100)} onChange={(e) => patch(selected.id, { opacity: Number(e.target.value) / 100 }, "op")} className="w-full" />
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input type="checkbox" checked={selected.shadow} onChange={(e) => patch(selected.id, { shadow: e.target.checked })} />
                  Drop shadow
                </label>
                <label className="block text-xs text-white/70">
                  Blur {selected.blur}px
                  <input type="range" min={0} max={12} value={selected.blur} onChange={(e) => patch(selected.id, { blur: Number(e.target.value) }, "blur")} className="w-full" />
                </label>
              </Section>

              <Section title="Transform" open={open.transform} onToggle={() => setOpen({ ...open, transform: !open.transform })}>
                <label className="flex items-center gap-2 text-xs text-white/70">
                  Rotation
                  <input type="number" step="1" value={Math.round(selected.rot * 10) / 10} onChange={(e) => patch(selected.id, { rot: parseFloat(e.target.value) || 0 }, "rot")} className="w-20 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-right text-sm" />°
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={`${tb} ${selected.flipX ? tbOn : ""}`} onClick={() => patch(selected.id, { flipX: !selected.flipX })}>Flip H</button>
                  <button type="button" className={`${tb} ${selected.flipY ? tbOn : ""}`} onClick={() => patch(selected.id, { flipY: !selected.flipY })}>Flip V</button>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-white/45">Align to its view</p>
                <div className="grid grid-cols-6 gap-1">
                  {(["l", "c", "r", "t", "m", "b"] as const).map((a, i) => (
                    <button key={a} type="button" className={tb} onClick={() => align(a)} title={["Left", "Center", "Right", "Top", "Middle", "Bottom"][i]}>{["⇤", "↔", "⇥", "⤒", "↕", "⤓"][i]}</button>
                  ))}
                </div>
              </Section>
            </div>
          )}
          {msg && <p className="mt-3 text-xs text-[#d9f000]">{msg}</p>}
        </aside>

        {/* canvas */}
        <div className="order-1 min-w-0 lg:order-2">
          <div ref={wrapRef} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white" style={{ height: size.ch }}>
            <svg
              ref={svgRef}
              className="wd-svg block select-none"
              width={size.cw}
              height={size.ch}
              viewBox={`${vt.x} ${vt.y} ${size.cw / vt.k} ${size.ch / vt.k}`}
              style={{ touchAction: "none", isolation: "isolate", cursor: hand ? "grab" : "default" }}
              onPointerDownCapture={onDownCapture}
              onPointerDown={onBgDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <style>{CSS_TOGGLES(lines, labels)}</style>
              <rect x={vx0 - 4000} y={vy0 - 4000} width={vw + 8000} height={vh + 8000} fill="#f3f4f6" />
              <rect x={vx0} y={vy0} width={vw} height={vh} fill="#fff" />
              <g dangerouslySetInnerHTML={{ __html: bodyStr }} />
              <g clipPath={keep ? "url(#bodyclip)" : undefined}>
                {layers.map((l) =>
                  l.hidden ? null : (
                    <g key={l.id} style={{ cursor: hand ? "grab" : l.locked ? "not-allowed" : "move" }} onPointerDown={(e) => begin(e, "move", l)} dangerouslySetInnerHTML={{ __html: layerMarkup(l) }} />
                  ),
                )}
              </g>
              <g style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: src.details }} />
              <g style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: src.labels }} />

              {snapLines.xs.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={vy0} y2={vy0 + vh} stroke="#18d3e8" strokeWidth={px} style={{ pointerEvents: "none" }} />)}
              {snapLines.ys.map((y) => <line key={`y${y}`} y1={y} y2={y} x1={vx0} x2={vx0 + vw} stroke="#18d3e8" strokeWidth={px} style={{ pointerEvents: "none" }} />)}

              {selBox && !selBox.hidden && (
                <g transform={`translate(${selBox.cx} ${selBox.cy}) rotate(${selBox.rot})`}>
                  <rect x={-selBox.w / 2} y={-selBox.h / 2} width={selBox.w} height={selBox.h} fill="none" stroke={selBox.locked ? "#d9f000" : "#d94cb3"} strokeWidth={1.5 * px} strokeDasharray={selBox.locked ? `${5 * px} ${4 * px}` : undefined} style={{ pointerEvents: "none" }} />
                  {!selBox.locked && (
                    <>
                      <line x1={0} y1={-selBox.h / 2} x2={0} y2={-selBox.h / 2 - 30 * px} stroke="#d94cb3" strokeWidth={1.5 * px} style={{ pointerEvents: "none" }} />
                      <circle cx={0} cy={-selBox.h / 2 - 30 * px} r={13 * px} fill="transparent" style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, "rot", selBox)} />
                      <circle cx={0} cy={-selBox.h / 2 - 30 * px} r={6 * px} fill="#fff" stroke="#d94cb3" strokeWidth={1.5 * px} style={{ pointerEvents: "none" }} />
                      {HANDLES.filter((h) => !(selBox.type === "shape" && selBox.shape === "line" && h.y !== 0)).map((h) => (
                        <g key={h.id}>
                          <circle cx={(h.x * selBox.w) / 2} cy={(h.y * selBox.h) / 2} r={13 * px} fill="transparent" style={{ cursor: `${h.id}-resize` }} onPointerDown={(e) => begin(e, "scale", selBox, h.id)} />
                          <circle cx={(h.x * selBox.w) / 2} cy={(h.y * selBox.h) / 2} r={5.5 * px} fill="#fff" stroke="#d94cb3" strokeWidth={1.5 * px} style={{ pointerEvents: "none" }} />
                        </g>
                      ))}
                    </>
                  )}
                </g>
              )}
            </svg>

            {rulers && (
              <>
                <svg className="pointer-events-none absolute left-0 top-0" width={size.cw} height={20} aria-hidden>
                  <rect width={size.cw} height={20} fill="rgba(17,17,24,0.85)" />
                  {rulerTicks("x").map((t, i) => (
                    <g key={i}>
                      <line x1={t.pos} x2={t.pos} y1={t.major ? 8 : 14} y2={20} stroke="#bbb" strokeWidth={1} />
                      {t.label && <text x={t.pos + 3} y={10} fontSize={9} fill="#ddd">{t.label}</text>}
                    </g>
                  ))}
                </svg>
                <svg className="pointer-events-none absolute left-0 top-0" width={20} height={size.ch} aria-hidden>
                  <rect width={20} height={size.ch} fill="rgba(17,17,24,0.85)" />
                  {rulerTicks("y").map((t, i) => (
                    <g key={i}>
                      <line y1={t.pos} y2={t.pos} x1={t.major ? 8 : 14} x2={20} stroke="#bbb" strokeWidth={1} />
                      {t.label && <text transform={`translate(10 ${t.pos + 3}) rotate(-90)`} fontSize={9} fill="#ddd" textAnchor="end">{t.label}</text>}
                    </g>
                  ))}
                </svg>
              </>
            )}
          </div>

          {/* status bar */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-[#14141c] px-4 py-3 text-xs">
            <span className="font-headline uppercase tracking-widest text-white/50">Vehicle</span>
            <b className="text-sm">{tpl.make === "Custom" ? tpl.label : `${tpl.year} ${tpl.make} ${tpl.model}`}</b>
            <span className="text-white/65">length: {tpl.lengthIn}&quot; ({ftIn(tpl.lengthIn)})</span>
            {tpl.wheelbaseIn > 0 && <span className="text-white/65">wheelbase: {tpl.wheelbaseIn}&quot; ({ftIn(tpl.wheelbaseIn)})</span>}
            <span className="rounded-full bg-[#d94cb3]/25 px-3 py-1 font-bold text-[#ffb6e6]">
              coverage: {cov ? `${cov.sqft.toFixed(1)} sq ft · ~${Math.round(cov.pct)}%` : "…"}
            </span>
            <span className="ml-auto text-white/65">scale: 1:20</span>
            <button type="button" className={tb} onClick={exportPng} disabled={busy}>PNG</button>
            <button type="button" className={tb} onClick={exportPdf} disabled={busy}>PDF</button>
          </div>
          <p className="mt-2 text-[11px] text-white/45">
            Drag artwork to move it. Handles resize and rotate. Sizes are real inches on the vehicle (1 inch on the 1:20 template = 20 inches on the truck). {selected ? `Selected: ${fmtLen(selected.w, cm)} × ${fmtLen(selected.h, cm)}.` : ""} This is a visual impression, not a production proof.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button type="button" className={tb + " h-11 px-5"} onClick={onChangeVehicle}>Change vehicle</button>
        <button type="button" className="accent-gradient inline-flex h-11 items-center rounded-full px-6 text-sm font-bold uppercase tracking-wide text-black" onClick={onContinue}>
          Continue to review &amp; download
        </button>
      </div>
    </div>
  );
}
