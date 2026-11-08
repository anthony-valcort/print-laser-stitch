// In-browser template importer: .eps / .ai / .pdf  ->  combined 1:20 template sheet SVG.
// Pure TypeScript (no DOM needed except DecompressionStream for PDF streams).

import type { WrapTemplate, WrapView } from "@/lib/wrap-templates";

type RGB = [number, number, number];
export type VPath = {
  d: string;
  fill: RGB | null;
  stroke: RGB | null;
  sw: number;
  evenodd: boolean;
  comp: number;
  /** x0, x1, y0, y1 in sheet coordinates (y already flipped) */
  bb: [number, number, number, number];
};
export type Parsed = { paths: VPath[]; box: [number, number, number, number] | null; format: string };

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const cmyk = (c: number, m: number, y: number, k: number): RGB =>
  [c, m, y].map((v) => Math.round(255 * (1 - Math.min(1, v + k)))) as RGB;
const gray = (v: number): RGB => {
  const g = Math.round(255 * v);
  return [g, g, g];
};
const rgbc = (r: number, g: number, b: number): RGB => [r, g, b].map((v) => Math.round(255 * Math.max(0, Math.min(1, v)))) as RGB;

type M = [number, number, number, number, number, number];
const ID: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
]; // a applied first, then b (PDF/PS row-vector convention)

/** Runs the shared path/paint interpreter over a token stream (AI3 PostScript, PDF content, or plain PostScript). */
function interpret(text: string, forms?: (name: string) => { text: string; m: M } | null, depth = 0): VPath[] {
  const toks = text.split(/[\s]+/);
  const out: VPath[] = [];
  let st: (number | string)[] = [];
  let cur: string[] = [];
  let bb: [number, number, number, number] = [Infinity, -Infinity, Infinity, -Infinity];
  let ctm: M = ID;
  const stack: { ctm: M; fill: RGB | null; stroke: RGB; sw: number }[] = [];
  let fill: RGB | null = [0, 0, 0];
  let stroke: RGB = [0, 0, 0];
  let sw = 1;
  let comp = 0;
  let incomp = false;
  let uniq = 0;
  let px = 0;
  let py = 0;
  let sx = 0;
  let sy = 0;

  const T = (x: number, y: number): [number, number] => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
  const pt = (x: number, y: number) => {
    const [a, b] = T(x, y);
    const Y = -b;
    if (a < bb[0]) bb[0] = a;
    if (a > bb[1]) bb[1] = a;
    if (Y < bb[2]) bb[2] = Y;
    if (Y > bb[3]) bb[3] = Y;
    return `${a.toFixed(2)} ${Y.toFixed(2)}`;
  };
  const move = (x: number, y: number) => {
    px = sx = x;
    py = sy = y;
    cur.push(`M${pt(x, y)}`);
  };
  const line = (x: number, y: number) => {
    px = x;
    py = y;
    cur.push(`L${pt(x, y)}`);
  };
  const curve = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    cur.push(`C${pt(x1, y1)} ${pt(x2, y2)} ${pt(x3, y3)}`);
    px = x3;
    py = y3;
  };
  const reset = () => {
    cur = [];
    bb = [Infinity, -Infinity, Infinity, -Infinity];
  };
  const scale = () => Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])) || 1;
  const emit = (doFill: boolean, doStroke: boolean, close: boolean, eo = false) => {
    if (!cur.length) return;
    if (!isFinite(bb[0])) {
      reset();
      return;
    }
    uniq++;
    out.push({
      d: cur.join("") + (close ? "Z" : ""),
      fill: doFill ? fill : null,
      stroke: doStroke ? stroke : null,
      sw: sw * scale(),
      evenodd: eo,
      comp: incomp ? comp : -uniq,
      bb: [bb[0], bb[1], bb[2], bb[3]],
    });
    reset();
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t) continue;
    if (NUM.test(t)) {
      st.push(parseFloat(t));
      continue;
    }
    if (t[0] === "/") {
      st.push(t);
      continue;
    }
    const a = st;
    const n = a.length;
    const num = (k: number) => (typeof a[n - k] === "number" ? (a[n - k] as number) : NaN);
    try {
      switch (t) {
        case "m":
        case "moveto":
          if (n >= 2) move(num(2), num(1));
          break;
        case "rmoveto":
          if (n >= 2) move(px + num(2), py + num(1));
          break;
        case "l":
        case "L":
        case "lineto":
          if (n >= 2) line(num(2), num(1));
          break;
        case "rlineto":
          if (n >= 2) line(px + num(2), py + num(1));
          break;
        case "c":
        case "C":
        case "curveto":
          if (n >= 6) curve(num(6), num(5), num(4), num(3), num(2), num(1));
          break;
        case "v":
        case "V":
          if (n >= 4) curve(px, py, num(4), num(3), num(2), num(1));
          break;
        case "y":
        case "Y":
          if (n >= 4) curve(num(4), num(3), num(2), num(1), num(2), num(1));
          break;
        case "h":
        case "closepath":
          if (cur.length) {
            cur.push("Z");
            px = sx;
            py = sy;
          }
          break;
        case "re":
          if (n >= 4) {
            const x = num(4);
            const y = num(3);
            const w = num(2);
            const h = num(1);
            move(x, y);
            line(x + w, y);
            line(x + w, y + h);
            line(x, y + h);
            cur.push("Z");
          }
          break;
        case "k":
          if (n >= 4) fill = cmyk(num(4), num(3), num(2), num(1));
          break;
        case "K":
          if (n >= 4) stroke = cmyk(num(4), num(3), num(2), num(1));
          break;
        case "g":
        case "setgray":
          if (n >= 1) fill = gray(num(1));
          break;
        case "G":
          if (n >= 1) stroke = gray(num(1));
          break;
        case "rg":
        case "setrgbcolor":
          if (n >= 3) fill = rgbc(num(3), num(2), num(1));
          break;
        case "RG":
          if (n >= 3) stroke = rgbc(num(3), num(2), num(1));
          break;
        case "setcmykcolor":
          if (n >= 4) fill = stroke = cmyk(num(4), num(3), num(2), num(1));
          break;
        case "sc":
        case "scn":
        case "SC":
        case "SCN": {
          const nums = a.filter((v) => typeof v === "number") as number[];
          let c: RGB | null = null;
          if (a.some((v) => typeof v === "string")) c = [200, 200, 200]; // pattern / named colour: neutral stand-in
          else if (nums.length === 1) c = gray(nums[0]);
          else if (nums.length === 3) c = rgbc(nums[0], nums[1], nums[2]);
          else if (nums.length === 4) c = cmyk(nums[0], nums[1], nums[2], nums[3]);
          if (c) {
            if (t === "sc" || t === "scn") fill = c;
            else stroke = c;
          }
          break;
        }
        case "w":
        case "setlinewidth":
          if (n >= 1) sw = num(1);
          break;
        case "f":
        case "F":
        case "fill":
          emit(true, false, false);
          break;
        case "f*":
        case "eofill":
          emit(true, false, false, true);
          break;
        case "b":
          emit(true, true, true);
          break;
        case "B":
        case "B*":
          emit(true, true, false, t === "B*");
          break;
        case "b*":
          emit(true, true, true, true);
          break;
        case "s":
          emit(false, true, true);
          break;
        case "S":
        case "stroke":
          emit(false, true, false);
          break;
        case "n":
        case "N":
        case "newpath":
          reset();
          break;
        case "*u":
          comp++;
          incomp = true;
          break;
        case "*U":
          comp++;
          incomp = false;
          break;
        case "q":
        case "gsave":
          stack.push({ ctm, fill, stroke, sw });
          break;
        case "Q":
        case "grestore": {
          const s = stack.pop();
          if (s) ({ ctm, fill, stroke, sw } = s);
          break;
        }
        case "cm":
        case "concat":
          if (n >= 6) ctm = mul([num(6), num(5), num(4), num(3), num(2), num(1)], ctm);
          break;
        case "translate":
          if (n >= 2) ctm = mul([1, 0, 0, 1, num(2), num(1)], ctm);
          break;
        case "scale":
          if (n >= 2) ctm = mul([num(2), 0, 0, num(1), 0, 0], ctm);
          break;
        case "Do": {
          const nm = a[n - 1];
          if (typeof nm === "string" && forms && depth < 4) {
            const f = forms(nm.slice(1));
            if (f) {
              const sub = interpretWith(f.text, forms, depth + 1, mul(f.m, ctm));
              for (const p of sub) {
                p.comp = p.comp >= 0 ? p.comp + 100000 * (depth + 1) + comp : p.comp - uniq;
                out.push(p);
              }
            }
          }
          break;
        }
        default:
          break;
      }
    } catch {
      /* ignore a bad operator */
    }
    // AI3 "f" / "b" / "s" lower-case variants close the path; handled by 'Z' on h in PDF and implicit fill closure otherwise
    st = [];
  }
  return out;
}

function interpretWith(text: string, forms: ((name: string) => { text: string; m: M } | null) | undefined, depth: number, ctm: M): VPath[] {
  // run with an initial transform by prefixing a cm operator
  const pre = `${ctm[0]} ${ctm[1]} ${ctm[2]} ${ctm[3]} ${ctm[4]} ${ctm[5]} cm `;
  return interpret(pre + text, forms, depth);
}

/** Merge consecutive pieces of one compound path into a single path so holes render. */
function mergeCompound(ps: VPath[]): VPath[] {
  const same = (a: RGB | null, b: RGB | null) => (a === null && b === null) || (!!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
  const out: VPath[] = [];
  for (const p of ps) {
    const l = out[out.length - 1];
    if (l && p.comp >= 0 && l.comp === p.comp && same(l.fill, p.fill) && same(l.stroke, p.stroke) && l.evenodd === p.evenodd) {
      l.d += p.d;
      l.bb = [Math.min(l.bb[0], p.bb[0]), Math.max(l.bb[1], p.bb[1]), Math.min(l.bb[2], p.bb[2]), Math.max(l.bb[3], p.bb[3])];
    } else out.push({ ...p });
  }
  return out;
}

/* ------------------------------------------------------------------ bytes / text */

export function bytesToBinary(u8: Uint8Array): string {
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CH)));
  return s;
}
const binToBytes = (s: string) => {
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
  return u;
};

async function inflate(bin: string): Promise<string> {
  const ds = new DecompressionStream("deflate");
  const w = ds.writable.getWriter();
  w.write(binToBytes(bin)).catch(() => undefined);
  w.close().catch(() => undefined);
  const r = ds.readable.getReader();
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await r.read();
      if (value) parts.push(value);
      if (done) break;
    }
  } catch {
    /* keep what decoded before the error */
  }
  let len = 0;
  for (const p of parts) len += p.length;
  const all = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    all.set(p, o);
    o += p.length;
  }
  return bytesToBinary(all);
}

/* ------------------------------------------------------------------ EPS / AI (PostScript) */

function parsePostScript(bin: string): Parsed {
  let d = bin;
  // DOS EPS binary header
  if (d.charCodeAt(0) === 0xc5 && d.charCodeAt(1) === 0xd0 && d.charCodeAt(2) === 0xd3 && d.charCodeAt(3) === 0xc6) {
    const rd = (o: number) => d.charCodeAt(o) | (d.charCodeAt(o + 1) << 8) | (d.charCodeAt(o + 2) << 16) | (d.charCodeAt(o + 3) << 24);
    const off = rd(4);
    const len = rd(8);
    d = d.slice(off, off + len);
  }
  const bm = /%%BoundingBox:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(d.slice(0, 20000));
  const hr = /%%HiResBoundingBox:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(d.slice(0, 20000));
  const m = hr || bm;
  let s = d.indexOf("%%EndSetup");
  s = s >= 0 ? s + 10 : Math.max(0, d.indexOf("%%EndProlog"));
  let e = d.indexOf("%%EOF", s);
  if (e < 0) e = d.length;
  const paths = mergeCompound(interpret(d.slice(s, e), undefined));
  const box = m ? ([parseFloat(m[1]), -parseFloat(m[4]), parseFloat(m[3]) - parseFloat(m[1]), parseFloat(m[4]) - parseFloat(m[2])] as [number, number, number, number]) : null;
  return { paths, box, format: "EPS/AI (PostScript)" };
}

/* ------------------------------------------------------------------ PDF / modern AI */

type PV = unknown;
type Ref = { ref: number };
const isRef = (v: PV): v is Ref => typeof v === "object" && v !== null && "ref" in (v as object);

/** Minimal PDF object parser (numbers, names, arrays, dicts, refs). Strings are skipped. */
function parsePdfValue(s: string, pos = 0): { v: PV; pos: number } {
  const ws = /[\s\0]/;
  const skip = () => {
    for (;;) {
      while (pos < s.length && ws.test(s[pos])) pos++;
      if (s[pos] === "%") while (pos < s.length && s[pos] !== "\n" && s[pos] !== "\r") pos++;
      else break;
    }
  };
  skip();
  const c = s[pos];
  if (s.startsWith("<<", pos)) {
    pos += 2;
    const o: Record<string, PV> = {};
    for (;;) {
      skip();
      if (s.startsWith(">>", pos) || pos >= s.length) {
        pos += 2;
        break;
      }
      const k = parsePdfValue(s, pos);
      pos = k.pos;
      const v = parsePdfValue(s, pos);
      pos = v.pos;
      if (typeof k.v === "string") o[k.v] = v.v;
    }
    return { v: o, pos };
  }
  if (c === "[") {
    pos++;
    const a: PV[] = [];
    for (;;) {
      skip();
      if (s[pos] === "]" || pos >= s.length) {
        pos++;
        break;
      }
      const r = parsePdfValue(s, pos);
      a.push(r.v);
      pos = r.pos;
    }
    return { v: a, pos };
  }
  if (c === "/") {
    let e = pos + 1;
    while (e < s.length && !/[\s/<>[\]()%]/.test(s[e])) e++;
    return { v: s.slice(pos, e), pos: e };
  }
  if (c === "(") {
    let depth = 0;
    let e = pos;
    for (; e < s.length; e++) {
      if (s[e] === "\\") e++;
      else if (s[e] === "(") depth++;
      else if (s[e] === ")" && --depth === 0) break;
    }
    return { v: "", pos: e + 1 };
  }
  if (c === "<") {
    const e = s.indexOf(">", pos);
    return { v: "", pos: e + 1 };
  }
  const m = /^([+-]?\d+)\s+(\d+)\s+R(?![A-Za-z])/.exec(s.slice(pos, pos + 40));
  if (m) return { v: { ref: parseInt(m[1], 10) }, pos: pos + m[0].length };
  const w = /^[^\s/<>[\]()%]+/.exec(s.slice(pos, pos + 60));
  if (!w) return { v: null, pos: pos + 1 };
  const tok = w[0];
  return { v: NUM.test(tok) ? parseFloat(tok) : tok === "true" ? true : tok === "false" ? false : null, pos: pos + tok.length };
}

type PObj = { dict: Record<string, PV>; stream?: string };

async function parsePdf(bin: string): Promise<Parsed> {
  const objs = new Map<number, PObj>();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  const starts: { n: number; at: number }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(bin))) starts.push({ n: parseInt(mm[1], 10), at: mm.index + mm[0].length });
  for (let i = 0; i < starts.length; i++) {
    const { n, at } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].at : bin.length;
    const body = bin.slice(at, end);
    const first = parsePdfValue(body, 0);
    const dict = (first.v && typeof first.v === "object" && !Array.isArray(first.v) && !isRef(first.v) ? first.v : {}) as Record<string, PV>;
    const sm = /stream\r?\n/.exec(body.slice(first.pos, first.pos + 40));
    let stream: string | undefined;
    if (sm) {
      const from = first.pos + sm.index + sm[0].length;
      const to = body.lastIndexOf("endstream");
      stream = body.slice(from, to > from ? to : undefined).replace(/\r?\n$/, "");
    }
    objs.set(n, { dict, stream });
  }
  const get = (v: PV): PV => (isRef(v) ? objs.get(v.ref)?.dict ?? null : v);
  const decode = async (o: PObj): Promise<string> => {
    if (o.stream === undefined) return "";
    const f = o.dict["/Filter"];
    const fl = (Array.isArray(f) ? f : [f]).filter(Boolean) as string[];
    if (fl.length === 0) return o.stream;
    if (fl.length === 1 && (fl[0] === "/FlateDecode" || fl[0] === "/Fl")) return inflate(o.stream);
    return "";
  };
  // object streams (PDF 1.5)
  for (const [, o] of Array.from(objs.entries())) {
    if (o.dict["/Type"] === "/ObjStm" && o.stream !== undefined) {
      const txt = await decode(o);
      const N = Number(o.dict["/N"] ?? 0);
      const First = Number(o.dict["/First"] ?? 0);
      const hdr = txt.slice(0, First).trim().split(/\s+/).map(Number);
      for (let i = 0; i < N; i++) {
        const num = hdr[i * 2];
        const off = hdr[i * 2 + 1];
        if (!isFinite(num) || !isFinite(off)) continue;
        const v = parsePdfValue(txt, First + off).v;
        if (v && typeof v === "object" && !Array.isArray(v) && !isRef(v) && !objs.has(num)) objs.set(num, { dict: v as Record<string, PV> });
      }
    }
  }
  // first page
  let page: Record<string, PV> | null = null;
  const pages = Array.from(objs.entries()).filter(([, o]) => o.dict["/Type"] === "/Page");
  const root = Array.from(objs.values()).find((o) => o.dict["/Type"] === "/Pages");
  if (root && Array.isArray(root.dict["/Kids"])) {
    const k = (root.dict["/Kids"] as PV[])[0];
    const p = get(k);
    if (p && (p as Record<string, PV>)["/Type"] === "/Page") page = p as Record<string, PV>;
  }
  if (!page && pages.length) page = pages.sort((a, b) => a[0] - b[0])[0][1].dict;
  if (!page) throw new Error("No page found in this PDF/AI file.");

  // inherit MediaBox from parent if needed
  const boxArr = (page["/CropBox"] ?? page["/MediaBox"] ?? (root ? root.dict["/MediaBox"] : null)) as PV;
  const ab = (Array.isArray(boxArr) ? (boxArr as PV[]).map((v) => Number(get(v) ?? v)) : null) as number[] | null;
  const box = ab && ab.length === 4 && ab.every(isFinite) ? ([Math.min(ab[0], ab[2]), -Math.max(ab[1], ab[3]), Math.abs(ab[2] - ab[0]), Math.abs(ab[3] - ab[1])] as [number, number, number, number]) : null;

  const contents = page["/Contents"];
  const refs: PV[] = Array.isArray(contents) ? (contents as PV[]) : [contents];
  let text = "";
  for (const r of refs) {
    if (isRef(r)) {
      const o = objs.get(r.ref);
      if (o) text += (await decode(o)) + "\n";
    }
  }
  if (!text.trim()) throw new Error("This file has no readable vector page content. In Illustrator, save with “Create PDF Compatible File” on.");

  // form XObjects (Do)
  const res = get(page["/Resources"]) as Record<string, PV> | null;
  const xo = res ? (get(res["/XObject"]) as Record<string, PV> | null) : null;
  const formCache = new Map<string, { text: string; m: M } | null>();
  const forms = (name: string) => formCache.get(name) ?? null;
  if (xo) {
    for (const [k, v] of Object.entries(xo)) {
      if (!isRef(v)) continue;
      const o = objs.get(v.ref);
      if (!o || o.dict["/Subtype"] !== "/Form") {
        formCache.set(k.slice(1), null);
        continue;
      }
      const mx = Array.isArray(o.dict["/Matrix"]) ? ((o.dict["/Matrix"] as PV[]).map(Number) as number[]) : null;
      formCache.set(k.slice(1), { text: await decode(o), m: mx && mx.length === 6 ? (mx as M) : ID });
    }
  }
  const paths = mergeCompound(interpret(text, forms));
  return { paths, box, format: "PDF / Illustrator (PDF-compatible)" };
}

export async function parseVector(file: Uint8Array): Promise<Parsed> {
  const head = bytesToBinary(file.subarray(0, 1200));
  const bin = bytesToBinary(file);
  let res: Parsed;
  if (head.includes("%PDF-")) res = await parsePdf(bin);
  else if (head.startsWith("%!PS") || head.charCodeAt(0) === 0xc5 || head.includes("%!PS-Adobe")) res = parsePostScript(bin);
  else throw new Error("Unsupported file. Use .eps, .ai (saved PDF-compatible) or .pdf.");
  if (res.paths.length < 10) throw new Error("Couldn't find vector artwork in that file.");
  return res;
}

/* ------------------------------------------------------------------ sheet builder */

export type BuildResult = {
  svg: string;
  views: WrapView[];
  sheet: [number, number, number, number];
  glass: number[];
  guessedGlass: number[];
  glassCandidates: number[];
  stats: { paths: number; bodyPaths: number; views: number; sideLengthIn: number };
};

const hex = (c: RGB) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const r1 = (s: string) => s.replace(/(\d+\.\d)\d+/g, "$1").replace(/\.0(?=[ A-Za-z"]|$)/g, "");
const isWhite = (c: RGB | null) => !!c && c[0] >= 250 && c[1] >= 250 && c[2] >= 250;

export function buildSheet(parsed: Parsed, opts: { glass?: number[] } = {}): BuildResult {
  const all = parsed.paths;
  // artboard
  let [X0, Y0, W, H] = parsed.box ?? [0, 0, 0, 0];
  if (!parsed.box || W <= 0 || H <= 0) {
    const bx = [Infinity, -Infinity, Infinity, -Infinity];
    for (const p of all) {
      bx[0] = Math.min(bx[0], p.bb[0]);
      bx[1] = Math.max(bx[1], p.bb[1]);
      bx[2] = Math.min(bx[2], p.bb[2]);
      bx[3] = Math.max(bx[3], p.bb[3]);
    }
    X0 = bx[0] - 10;
    Y0 = bx[2] - 10;
    W = bx[1] - bx[0] + 20;
    H = bx[3] - bx[2] + 20;
  }
  const keep = all.filter((p) => p.bb[0] >= X0 - 8 && p.bb[1] <= X0 + W + 8 && p.bb[2] >= Y0 - 8 && p.bb[3] <= Y0 + H + 8);

  // body silhouettes: white fill with an outline (template convention), else any white fill
  const minA = W * H * 0.00002;
  const area = (p: VPath) => (p.bb[1] - p.bb[0]) * (p.bb[3] - p.bb[2]);
  let bodyIdx = keep.map((p, i) => (isWhite(p.fill) && p.stroke && area(p) > minA ? i : -1)).filter((i) => i >= 0);
  if (bodyIdx.length < 3) bodyIdx = keep.map((p, i) => (isWhite(p.fill) && area(p) > minA ? i : -1)).filter((i) => i >= 0);
  if (!bodyIdx.length) throw new Error("Couldn't find the vehicle outline (white-filled shapes). Is this a vehicle template?");

  // cluster body bboxes into views
  const gap = Math.max(W, H) * 0.012;
  const boxes = bodyIdx.map((i) => keep[i].bb);
  const parent = boxes.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a[0] - gap <= b[1] && b[0] - gap <= a[1] && a[2] - gap <= b[3] && b[2] - gap <= a[3]) parent[find(i)] = find(j);
    }
  const groups = new Map<number, number[]>();
  boxes.forEach((_, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  });
  type Cl = { x0: number; x1: number; y0: number; y1: number; a: number };
  let cls: Cl[] = Array.from(groups.values()).map((g) => {
    const c: Cl = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, a: 0 };
    for (const i of g) {
      const b = boxes[i];
      c.x0 = Math.min(c.x0, b[0]);
      c.x1 = Math.max(c.x1, b[1]);
      c.y0 = Math.min(c.y0, b[2]);
      c.y1 = Math.max(c.y1, b[3]);
      c.a += (b[1] - b[0]) * (b[3] - b[2]);
    }
    return c;
  });
  const maxA = Math.max(...cls.map((c) => c.a));
  cls = cls.filter((c) => c.a > maxA * 0.02); // drop specks
  const margin = Math.max(W, H) * 0.012;
  const inView = (b: [number, number, number, number]) => {
    const cx = (b[0] + b[1]) / 2;
    const cy = (b[2] + b[3]) / 2;
    return cls.findIndex((c) => cx >= c.x0 - margin && cx <= c.x1 + margin && cy >= c.y0 - margin && cy <= c.y1 + margin);
  };

  // glass guess: mid-gray whose large shapes (windows) are biggest on average
  const gStat = new Map<number, { n: number; a: number }>();
  for (const p of keep) {
    if (!p.fill || p.fill[0] !== p.fill[1] || p.fill[1] !== p.fill[2]) continue;
    const v = p.fill[0];
    if (v < 100 || v > 245 || inView(p.bb) < 0) continue;
    const a = area(p);
    if (a > W * H * 0.0004 && a < W * H * 0.05) {
      const e = gStat.get(v) ?? { n: 0, a: 0 };
      e.n++;
      e.a += a;
      gStat.set(v, e);
    }
  }
  const glassCandidates = Array.from(gStat.entries())
    .filter(([, e]) => e.n >= 3)
    .sort((a, b) => b[1].a / b[1].n - a[1].a / a[1].n)
    .map(([v]) => v)
    .slice(0, 6);
  const guessedGlass = glassCandidates.slice(0, 1);
  const glass = new Set(opts.glass ?? guessedGlass);

  const bodySet = new Set(bodyIdx);
  type Item = { c: "bl" | "gl" | "sh" | "lb"; p: VPath };
  const items: Item[] = [];
  const body: VPath[] = [];
  keep.forEach((p, i) => {
    const vi = inView(p.bb);
    if (bodySet.has(i) && vi >= 0) {
      body.push(p);
      if (p.stroke) items.push({ c: "bl", p: { ...p, fill: null } });
      return;
    }
    if (vi < 0) {
      items.push({ c: "lb", p });
      return;
    }
    if (p.fill === null) items.push({ c: "bl", p });
    else if (p.fill[0] === p.fill[1] && p.fill[1] === p.fill[2] && glass.has(p.fill[0]) && area(p) > W * H * 0.0004) items.push({ c: "gl", p });
    else items.push({ c: "sh", p });
  });

  const node = (p: VPath) =>
    `<path d="${r1(p.d)}" fill="${p.fill ? hex(p.fill) : "none"}" stroke="${p.stroke ? hex(p.stroke) : "none"}" stroke-width="${Math.round(p.sw * 100) / 100}"${p.evenodd ? ' fill-rule="evenodd"' : ""}/>`;
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${+X0.toFixed(2)} ${+Y0.toFixed(2)} ${+W.toFixed(2)} ${+H.toFixed(2)}">`];
  out.push('<defs><clipPath id="bodyclip">' + body.map((_, i) => `<use href="#b${i}"/>`).join("") + "</clipPath></defs>");
  out.push('<g id="bodyfill" class="body">' + body.map((p, i) => `<path id="b${i}" d="${r1(p.d)}"${p.evenodd ? ' fill-rule="evenodd"' : ""}/>`).join("") + "</g>");
  const runs: { c: string; nodes: string[] }[] = [];
  for (const it of items) {
    if (it.c === "lb") continue;
    const n = node(it.p);
    const l = runs[runs.length - 1];
    if (l && l.c === it.c) l.nodes.push(n);
    else runs.push({ c: it.c, nodes: [n] });
  }
  out.push('<g id="details">');
  for (const r of runs) out.push(`<g class="${r.c}"${r.c === "sh" || r.c === "bl" ? ' style="mix-blend-mode:multiply"' : ""}>${r.nodes.join("")}</g>`);
  out.push('</g><g id="labels" class="lb">' + items.filter((i) => i.c === "lb").map((i) => node(i.p)).join("") + "</g></svg>");

  // view bboxes from body paths, then names by shape
  const vb: Cl[] = cls.map((c) => ({ ...c, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }));
  for (const p of body) {
    const vi = inView(p.bb);
    const v = vb[vi];
    v.x0 = Math.min(v.x0, p.bb[0]);
    v.x1 = Math.max(v.x1, p.bb[1]);
    v.y0 = Math.min(v.y0, p.bb[2]);
    v.y1 = Math.max(v.y1, p.bb[3]);
  }
  const named = vb.map((v) => ({ x: v.x0, y: v.y0, w: v.x1 - v.x0, h: v.y1 - v.y0 }));
  // top view = tall/narrow; of the rest, the two widest are the sides, the others are front/rear
  const isTop = (v: { w: number; h: number }) => v.w / v.h < 0.8;
  const rest = named.filter((v) => !isTop(v)).sort((a, b) => b.w - a.w);
  const sideSet = new Set<{ w: number; h: number }>(rest.slice(0, 2));
  const kindOf = (v: { w: number; h: number }) => (isTop(v) ? "top" : sideSet.has(v) ? "side" : "end");
  const reading = [...named].sort((a, b) => (Math.abs(a.x - b.x) > Math.max(W, H) * 0.05 ? a.x - b.x : a.y - b.y));
  const counts = { side: 0, end: 0, top: 0 };
  const views: WrapView[] = reading.map((v) => {
    const kind = kindOf(v);
    counts[kind]++;
    const label = kind === "side" ? `Side ${counts.side}` : kind === "top" ? `Top${counts.top > 1 ? ` ${counts.top}` : ""}` : `Front / rear ${counts.end}`;
    return { key: `${kind}-${counts[kind]}`, label, x: Math.round(v.x), y: Math.round(v.y), w: Math.round(v.w), h: Math.round(v.h) };
  });
  const sides = views.filter((v) => v.key.startsWith("side"));
  const sideLen = ((sides.length ? Math.max(...sides.map((v) => v.w)) : Math.max(...views.map((v) => v.w))) * 20) / 72;
  return {
    svg: out.join(""),
    views,
    sheet: [X0, Y0, W, H],
    glass: Array.from(glass),
    guessedGlass,
    glassCandidates,
    stats: { paths: keep.length, bodyPaths: body.length, views: views.length, sideLengthIn: sideLen },
  };
}

export function makeTemplate(name: string, id: string, b: BuildResult, sheetUrl: string): WrapTemplate {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Custom vehicle";
  const len = Math.round(b.stats.sideLengthIn * 10) / 10;
  return {
    id,
    make: "Custom",
    model: base,
    year: new Date().getFullYear(),
    bodyStyle: "Imported template",
    category: "Your templates",
    label: base,
    sheetUrl,
    lengthIn: len,
    wheelbaseIn: 0,
    lengthMm: Math.round(len * 25.4),
    wheelbaseMm: 0,
    views: b.views,
  };
}
