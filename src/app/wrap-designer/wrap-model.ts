import { INCHES_PER_UNIT, type WrapTemplate } from "@/lib/wrap-templates";

export type FillKind = "solid" | "linear" | "radial";
export type Fill = { kind: FillKind; c1: string; c2: string; angle: number };
export type ShapeKind =
  | "rect"
  | "rounded"
  | "ellipse"
  | "triangle"
  | "rtriangle"
  | "diamond"
  | "hexagon"
  | "star"
  | "arrow"
  | "line";

export const SHAPES: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "rounded", label: "Rounded rectangle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "rtriangle", label: "Right triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "star", label: "Star" },
  { kind: "arrow", label: "Arrow" },
  { kind: "line", label: "Line / stripe" },
];

export type Layer = {
  id: string;
  type: "image" | "text" | "shape";
  shape: ShapeKind;
  name: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  fill: Fill;
  stroke: string;
  sw: number;
  hidden: boolean;
  locked: boolean;
  lockAspect: boolean;
  shadow: boolean;
  blur: number;
  href: string;
  text: string;
  font: string;
  bold: boolean;
  italic: boolean;
};

export type Design = { color: string; layers: Layer[] };

export type SheetSrc = {
  vb: [number, number, number, number];
  body: string;
  details: string;
  labels: string;
};

export const FONTS = [
  "Arial Black",
  "Impact",
  "Arial",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Brush Script MT",
];
export const SWATCHES = ["#ffffff", "#111111", "#c1121f", "#0b5fff", "#0f8a4b", "#f4b400", "#ff6a00", "#6d28d9", "#6b7280", "#2a8c8c", "#ff76b4"];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const toIn = (u: number) => u * INCHES_PER_UNIT;
export const fromIn = (i: number) => i / INCHES_PER_UNIT;

export function ftIn(inches: number) {
  const ft = Math.floor(inches / 12 + 1e-9);
  const rest = inches - ft * 12;
  return `${ft}'${(Math.round(rest * 10) / 10).toFixed(1).replace(/\.0$/, "")}"`;
}

export function fmtLen(units: number, cm: boolean) {
  const inch = toIn(units);
  return cm ? `${(inch * 2.54).toFixed(1)} cm` : `${inch.toFixed(1)}"`;
}

export const solid = (c: string): Fill => ({ kind: "solid", c1: c, c2: "#ffffff", angle: 0 });

export function newLayer(p: Partial<Layer> & Pick<Layer, "type" | "cx" | "cy" | "w" | "h">): Layer {
  return {
    id: uid(),
    shape: "rect",
    name: "Layer",
    rot: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    fill: solid("#0b5fff"),
    stroke: "#111111",
    sw: 0,
    hidden: false,
    locked: false,
    lockAspect: p.type !== "shape",
    shadow: false,
    blur: 0,
    href: "",
    text: "",
    font: "Arial Black",
    bold: false,
    italic: false,
    ...p,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n2 = (v: number) => Math.round(v * 100) / 100;

export function measureText(text: string, font: string, bold: boolean, italic: boolean, size: number) {
  const ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  if (!ctx) return size * Math.max(1, text.length) * 0.6;
  ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px "${font}"`;
  return Math.max(size * 0.5, ctx.measureText(text || " ").width);
}

function polygon(kind: ShapeKind, w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  let pts: [number, number][] = [];
  if (kind === "triangle") pts = [[0, -hh], [hw, hh], [-hw, hh]];
  else if (kind === "rtriangle") pts = [[-hw, -hh], [-hw, hh], [hw, hh]];
  else if (kind === "diamond") pts = [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
  else if (kind === "hexagon") pts = [[-hw * 0.5, -hh], [hw * 0.5, -hh], [hw, 0], [hw * 0.5, hh], [-hw * 0.5, hh], [-hw, 0]];
  else if (kind === "arrow")
    pts = [[-hw, -hh * 0.4], [hw * 0.25, -hh * 0.4], [hw * 0.25, -hh], [hw, 0], [hw * 0.25, hh], [hw * 0.25, hh * 0.4], [-hw, hh * 0.4]];
  else if (kind === "star") {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 1 : 0.42;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([Math.cos(a) * r * hw, Math.sin(a) * r * hh]);
    }
  }
  return pts.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ");
}

export type MarkupOpts = { mask?: boolean };

/** SVG markup for one layer, in sheet coordinates. */
export function layerMarkup(l: Layer, o: MarkupOpts = {}): string {
  const gid = `g${l.id}`;
  let defs = "";
  let paint = esc(l.fill.c1);
  if (l.fill.kind === "linear") {
    defs = `<linearGradient id="${gid}" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${l.fill.angle} 0.5 0.5)"><stop offset="0" stop-color="${esc(l.fill.c1)}"/><stop offset="1" stop-color="${esc(l.fill.c2)}"/></linearGradient>`;
    paint = `url(#${gid})`;
  } else if (l.fill.kind === "radial") {
    defs = `<radialGradient id="${gid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${esc(l.fill.c1)}"/><stop offset="1" stop-color="${esc(l.fill.c2)}"/></radialGradient>`;
    paint = `url(#${gid})`;
  }
  const hw = n2(l.w / 2);
  const hh = n2(l.h / 2);
  const stroke = l.sw > 0 ? ` stroke="${esc(l.stroke)}" stroke-width="${l.sw}" stroke-linejoin="round"` : "";
  let inner = "";
  if (l.type === "image") {
    inner = `<image x="${-hw}" y="${-hh}" width="${n2(l.w)}" height="${n2(l.h)}" preserveAspectRatio="none" href="${esc(l.href)}"/>`;
  } else if (l.type === "text") {
    inner = `<text text-anchor="middle" dominant-baseline="central" font-family="${esc(l.font)}" font-weight="${l.bold ? 700 : 400}" font-style="${
      l.italic ? "italic" : "normal"
    }" font-size="${n2(l.h * 0.8)}" textLength="${n2(l.w)}" lengthAdjust="spacingAndGlyphs" fill="${paint}"${stroke} paint-order="stroke">${esc(l.text)}</text>`;
  } else if (l.shape === "rect") {
    inner = `<rect x="${-hw}" y="${-hh}" width="${n2(l.w)}" height="${n2(l.h)}" fill="${paint}"${stroke}/>`;
  } else if (l.shape === "rounded") {
    inner = `<rect x="${-hw}" y="${-hh}" width="${n2(l.w)}" height="${n2(l.h)}" rx="${n2(Math.min(l.w, l.h) * 0.22)}" fill="${paint}"${stroke}/>`;
  } else if (l.shape === "ellipse") {
    inner = `<ellipse rx="${hw}" ry="${hh}" fill="${paint}"${stroke}/>`;
  } else if (l.shape === "line") {
    const sw = Math.max(1, l.sw || 4);
    inner = `<line x1="${-hw}" y1="0" x2="${hw}" y2="0" stroke="${esc(l.fill.c1)}" stroke-width="${sw}" stroke-linecap="round"/>`;
  } else {
    inner = `<polygon points="${polygon(l.shape, l.w, l.h)}" fill="${paint}"${stroke}/>`;
  }
  const fx = l.flipX ? -1 : 1;
  const fy = l.flipY ? -1 : 1;
  let filter = "";
  if (!o.mask) {
    const f: string[] = [];
    if (l.shadow) f.push("drop-shadow(3px 4px 4px rgba(0,0,0,0.5))");
    if (l.blur > 0) f.push(`blur(${l.blur}px)`);
    if (f.length) filter = ` style="filter:${f.join(" ")}"`;
  }
  return `<g transform="translate(${n2(l.cx)} ${n2(l.cy)}) rotate(${n2(l.rot)}) scale(${fx} ${fy})" opacity="${l.opacity}"${filter}>${
    defs ? `<defs>${defs}</defs>` : ""
  }${inner}</g>`;
}

export function parseSheet(svg: string): SheetSrc {
  const m = /viewBox="([^"]+)"/.exec(svg);
  const vb = (m ? m[1] : "0 0 100 100").split(/\s+/).map(Number) as [number, number, number, number];
  const inner = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  const i = inner.indexOf('<g id="details"');
  const j = inner.indexOf('<g id="labels"');
  return { vb, body: inner.slice(0, i), details: inner.slice(i, j), labels: inner.slice(j) };
}

export function bodyMarkup(src: SheetSrc, color: string) {
  return src.body.replace('<g id="bodyfill" class="body">', `<g id="bodyfill" fill="${esc(color)}">`);
}

export const CSS_TOGGLES = (lines: boolean, labels: boolean) =>
  `${lines ? "" : ".wd-svg .bl{display:none}"}${labels ? "" : ".wd-svg .lb{display:none}"}`;

export type RenderOpts = { width: number; keepOnBody: boolean; lines: boolean; labels: boolean };

export function sheetSvg(src: SheetSrc, design: Design, o: RenderOpts) {
  const [x, y, w, h] = src.vb;
  const height = Math.round((o.width * h) / w);
  const art = design.layers
    .filter((l) => !l.hidden)
    .map((l) => layerMarkup(l))
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="wd-svg" viewBox="${x} ${y} ${w} ${h}" width="${o.width}" height="${height}" style="isolation:isolate">` +
    `<style>${CSS_TOGGLES(o.lines, o.labels)}</style><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>` +
    `${bodyMarkup(src, design.color)}<g${o.keepOnBody ? ' clip-path="url(#bodyclip)"' : ""}>${art}</g>${src.details}${src.labels}</svg>`
  );
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("render failed"));
    };
    img.src = url;
  });
}

export async function renderSheet(src: SheetSrc, design: Design, o: RenderOpts, mime: string, q = 0.9) {
  const img = await loadSvg(sheetSvg(src, design, o));
  const h = Math.round((o.width * src.vb[3]) / src.vb[2]);
  const c = document.createElement("canvas");
  c.width = o.width;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, o.width, h);
  ctx.drawImage(img, 0, 0, o.width, h);
  return { dataUrl: c.toDataURL(mime, q), width: o.width, height: h };
}

/** Share of the vehicle body covered by artwork, and its area in square feet. */
export async function computeCoverage(src: SheetSrc, design: Design) {
  const W = 700;
  const [x, y, w, h] = src.vb;
  const H = Math.round((W * h) / w);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}">`;
  const bodyImg = await loadSvg(`${head}${src.body.replace('<g id="bodyfill" class="body">', '<g id="bodyfill" fill="#000">')}</svg>`);
  const art = design.layers
    .filter((l) => !l.hidden)
    .map((l) => layerMarkup(l, { mask: true }))
    .join("");
  const artImg = await loadSvg(`${head}${art}</svg>`);
  const read = (img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, W, H);
    return ctx.getImageData(0, 0, W, H).data;
  };
  const b = read(bodyImg);
  const a = read(artImg);
  let body = 0;
  let cov = 0;
  for (let i = 3; i < b.length; i += 4) {
    if (b[i] > 128) {
      body++;
      if (a[i] > 40) cov++;
    }
  }
  const unitPerPx = w / W;
  const sqftPerPx = (unitPerPx * INCHES_PER_UNIT) ** 2 / 144;
  return { sqft: cov * sqftPerPx, bodySqft: body * sqftPerPx, pct: body ? (cov / body) * 100 : 0 };
}

export function jpegToPdf(dataUrl: string, pxW: number, pxH: number, pageW: number, pageH: number): Blob {
  const bin = atob(dataUrl.split(",")[1]);
  const jpg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (u: Uint8Array) => {
    chunks.push(u);
    len += u.length;
  };
  const txt = (s: string) => push(enc.encode(s));
  txt("%PDF-1.4\n");
  const obj = (n: number, body: string) => {
    offsets[n] = len;
    txt(`${n} 0 obj\n${body}\nendobj\n`);
  };
  obj(1, "<</Type/Catalog/Pages 2 0 R>>");
  obj(2, "<</Type/Pages/Kids[3 0 R]/Count 1>>");
  obj(3, `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pageW} ${pageH}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>`);
  offsets[4] = len;
  txt(`4 0 obj\n<</Type/XObject/Subtype/Image/Width ${pxW}/Height ${pxH}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpg.length}>>\nstream\n`);
  push(jpg);
  txt("\nendstream\nendobj\n");
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  obj(5, `<</Length ${content.length}>>\nstream\n${content}\nendstream`);
  const xref = len;
  let x = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) x += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  x += `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  txt(x);
  const out = new Uint8Array(len);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return new Blob([out], { type: "application/pdf" });
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function readImage(file: File): Promise<{ href: string; w: number; h: number }> {
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
        const max = 1800;
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

/** Axis-aligned bounding box of a rotated layer. */
export function layerBox(l: Layer) {
  const r = (l.rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const w = l.w * c + l.h * s;
  const h = l.w * s + l.h * c;
  return { x0: l.cx - w / 2, x1: l.cx + w / 2, y0: l.cy - h / 2, y1: l.cy + h / 2 };
}

export type SavedDesign = { id: string; name: string; tplId: string; savedAt: number; design: Design };
const KEY = "pls-wrap-designs-v1";
const DRAFT = "pls-wrap-draft-v1";

export function loadSaved(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedDesign[]) : [];
    const cutoff = Date.now() - 90 * 86400000;
    return list.filter((d) => d.savedAt > cutoff);
  } catch {
    return [];
  }
}
export function writeSaved(list: SavedDesign[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
export function loadDraft(): { tplId: string; design: Design } | null {
  try {
    const raw = localStorage.getItem(DRAFT);
    return raw ? (JSON.parse(raw) as { tplId: string; design: Design }) : null;
  } catch {
    return null;
  }
}
export function writeDraft(tplId: string, design: Design) {
  try {
    localStorage.setItem(DRAFT, JSON.stringify({ tplId, design }));
  } catch {
    /* storage full or blocked: drafts are best-effort */
  }
}

export function tplViewFor(tpl: WrapTemplate, x: number, y: number) {
  let best = tpl.views[0];
  let bd = Infinity;
  for (const v of tpl.views) {
    const dx = Math.max(v.x - x, 0, x - (v.x + v.w));
    const dy = Math.max(v.y - y, 0, y - (v.y + v.h));
    const d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  return best;
}
