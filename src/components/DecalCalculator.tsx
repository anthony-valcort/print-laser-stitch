"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  BUNDLE_TIERS,
  DECAL_MATERIALS,
  TAX_RATE,
  calcJob,
  type MaterialKey,
  type MaterialLook,
} from "@/lib/decal-pricing";
import { useCart } from "@/lib/cart-store";
import type { DecalCartItem, DecalPanelLine } from "@/lib/cart-types";
import {
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";
import { unpackUpload } from "@/lib/draft-storage";
import { DraftNote, useDraft } from "@/components/configurator/useDraft";

/* ------------------------------------------------------------------ */
/* Types + saved-job storage                                           */
/* ------------------------------------------------------------------ */

type Unit = "in" | "ft";

type Item = {
  id: string;
  name: string;
  material: MaterialKey;
  /** Width / height as typed, in the current unit. */
  w: string;
  h: string;
  qty: number;
  imageUrl: string;
  imageName: string;
  /** Logo width ÷ height. 0 = not measured yet, -1 = can't be previewed. */
  aspect: number;
  /** Keep the logo's proportions when one side changes. */
  lock: boolean;
  note: string;
  /** Shop admin only: the real price override. */
  custom: string;
  /** Real print resolution read from the file (0 = unknown). */
  dpi: number;
  /** Real size in inches read from the file (SVG), 0 = unknown. */
  physW: number;
  physH: number;
  /** Where the current size came from. */
  sizeNote: string;
  /** Hide the white box around a logo that has a white background. */
  noWhite: boolean;
  /** Customer asks our designer to check the artwork. */
  design: boolean;
  /** Customer's wished-for price per sq ft (a request, not a price). */
  req: string;
};

type Snap = {
  jobId: string;
  jobName: string;
  installDate: string;
  notes: string;
  unit: Unit;
  selectedId: string;
  items: Item[];
};

type SavedJob = {
  id: string;
  name: string;
  savedAt: number;
  total: number;
  snap: Snap;
};

const SAVED_KEY = "pls_decal_saved_jobs_v1";
const MAX_SAVED = 20;
const MATERIAL_KEYS = new Set<string>(DECAL_MATERIALS.map((m) => m.key));

const ACCEPT_VECTOR =
  ".png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.ai,.eps,.cdr,.dxf,.psd,.tif,.tiff,.emf,.wmf,image/png,image/jpeg,image/svg+xml,application/pdf";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function newItem(material: MaterialKey = "full-vinyl"): Item {
  return {
    id: uid("item"),
    name: "",
    material,
    w: "",
    h: "",
    qty: 1,
    imageUrl: "",
    imageName: "",
    aspect: 0,
    lock: true,
    note: "",
    custom: "",
    dpi: 0,
    physW: 0,
    physH: 0,
    sizeNote: "",
    noWhite: false,
    design: false,
    req: "",
  };
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function num(v: unknown, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : 0;
}

/** A saved job comes from browser storage, so treat it as untrusted. */
function cleanSnap(raw: unknown): Snap | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.items) || r.items.length === 0) return null;
  const items: Item[] = r.items.slice(0, 30).map((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const url = str(o.imageUrl, 600);
    const qty = Number(o.qty);
    const aspect = Number(o.aspect);
    return {
      id: str(o.id, 60) || uid("item"),
      name: str(o.name, 60),
      material: (MATERIAL_KEYS.has(str(o.material, 40))
        ? str(o.material, 40)
        : "full-vinyl") as MaterialKey,
      w: str(o.w, 12),
      h: str(o.h, 12),
      qty: Number.isFinite(qty) ? Math.min(999, Math.max(1, Math.floor(qty))) : 1,
      imageUrl: /^https:\/\//i.test(url) ? url : "",
      imageName: str(o.imageName, 120),
      aspect:
        aspect === -1
          ? -1
          : Number.isFinite(aspect) && aspect > 0 && aspect < 100
            ? aspect
            : 0,
      lock: o.lock !== false,
      note: str(o.note, 500),
      custom: str(o.custom, 10),
      dpi: num(o.dpi, 1, 5000),
      physW: num(o.physW, 0.01, 2000),
      physH: num(o.physH, 0.01, 2000),
      sizeNote: str(o.sizeNote, 80),
      noWhite: o.noWhite === true,
      design: o.design === true,
      req: str(o.req, 10),
    };
  });
  const ids = new Set(items.map((i) => i.id));
  const sel = str(r.selectedId, 60);
  return {
    jobId: str(r.jobId, 60) || uid("job"),
    jobName: str(r.jobName, 80),
    installDate: /^\d{4}-\d{2}-\d{2}$/.test(str(r.installDate, 10))
      ? str(r.installDate, 10)
      : "",
    notes: str(r.notes, 2000),
    unit: r.unit === "ft" ? "ft" : "in",
    selectedId: ids.has(sel) ? sel : items[0].id,
    items,
  };
}

function readSaved(): SavedJob[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const out: SavedJob[] = [];
    for (const a of arr) {
      const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
      const snap = cleanSnap(o.snap);
      if (!snap) continue;
      out.push({
        id: str(o.id, 60) || snap.jobId,
        name: str(o.name, 80) || "Saved job",
        savedAt: Number(o.savedAt) || Date.now(),
        total: Number(o.total) || 0,
        snap,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function writeSaved(list: SavedJob[]): boolean {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Reading the real size out of a file                                 */
/* ------------------------------------------------------------------ */

type FileMeta = { dpi: number; physW: number; physH: number };

const UNIT_IN: Record<string, number> = {
  "": 1 / 96,
  px: 1 / 96,
  pt: 1 / 72,
  pc: 1 / 6,
  in: 1,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
};

function svgLen(v: string | undefined): number {
  if (!v) return 0;
  const m = /^\s*([0-9.]+)\s*([a-z%]*)\s*$/i.exec(v);
  if (!m || m[2] === "%") return 0;
  const k = UNIT_IN[m[2].toLowerCase()];
  return k ? Number(m[1]) * k : 0;
}

async function readFileMeta(f: File): Promise<FileMeta> {
  const none: FileMeta = { dpi: 0, physW: 0, physH: 0 };
  const name = f.name.toLowerCase();
  try {
    if (name.endsWith(".pdf") || f.type === "application/pdf") {
      return { dpi: 300, physW: 0, physH: 0 }; // rendered at 300 dpi
    }
    if (name.endsWith(".svg") || f.type === "image/svg+xml") {
      const text = (await f.text()).slice(0, 4000);
      const tag = /<svg[^>]*>/i.exec(text)?.[0] ?? "";
      const attr = (n: string) =>
        new RegExp(`\\s${n}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
      let w = svgLen(attr("width"));
      let h = svgLen(attr("height"));
      if (!(w > 0 && h > 0)) {
        const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
        if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
          w = vb[2] / 96;
          h = vb[3] / 96;
        }
      }
      return w > 0 && h > 0 ? { dpi: 0, physW: w, physH: h } : none;
    }
    const buf = await f.slice(0, 65536).arrayBuffer();
    const v = new DataView(buf);
    if (v.byteLength > 24 && v.getUint32(0) === 0x89504e47) {
      let off = 8;
      while (off + 12 <= v.byteLength) {
        const len = v.getUint32(off);
        const type = String.fromCharCode(
          v.getUint8(off + 4),
          v.getUint8(off + 5),
          v.getUint8(off + 6),
          v.getUint8(off + 7),
        );
        if (type === "pHYs" && off + 17 <= v.byteLength) {
          const x = v.getUint32(off + 8);
          const unitByte = v.getUint8(off + 16);
          const dpi = unitByte === 1 ? Math.round(x * 0.0254) : 0;
          return { dpi: dpi > 96 && dpi < 2400 ? dpi : 0, physW: 0, physH: 0 };
        }
        if (type === "IDAT") break;
        off += 12 + len;
      }
    } else if (v.byteLength > 20 && v.getUint16(0) === 0xffd8) {
      let off = 2;
      while (off + 4 < v.byteLength) {
        const marker = v.getUint16(off);
        const len = v.getUint16(off + 2);
        if (marker === 0xffe0 && v.getUint32(off + 4) === 0x4a464946) {
          const units = v.getUint8(off + 11);
          const x = v.getUint16(off + 12);
          const dpi = units === 1 ? x : units === 2 ? Math.round(x * 2.54) : 0;
          return { dpi: dpi > 96 && dpi < 2400 ? dpi : 0, physW: 0, physH: 0 };
        }
        if ((marker & 0xff00) !== 0xff00) break;
        off += 2 + len;
      }
    }
  } catch {
    /* fall through */
  }
  return none;
}

/** Best-guess print size (inches) for a logo of nw × nh pixels. */
function sizeFromFile(
  nw: number,
  nh: number,
  it: Pick<Item, "dpi" | "physW" | "physH">,
): { wi: number; hi: number; note: string } {
  let wi = 0;
  let hi = 0;
  let known = false;
  let note = "";
  if (it.physW > 0 && it.physH > 0) {
    wi = it.physW;
    hi = it.physH;
    known = true;
    note = "Size read from your file";
  } else if (it.dpi > 0) {
    wi = nw / it.dpi;
    hi = nh / it.dpi;
    known = true;
    note = "Size read from your file";
  }
  const longest = Math.max(wi, hi);
  if (!known || longest < 0.5 || longest > 240) {
    wi = nw / 150;
    hi = nh / 150;
    const k = Math.min(48, Math.max(4, Math.max(wi, hi))) / Math.max(wi, hi, 0.01);
    wi *= k;
    hi *= k;
    note = "Estimated size. Please check it";
  }
  return {
    wi: Math.round(wi * 10) / 10 || 1,
    hi: Math.round(hi * 10) / 10 || 1,
    note,
  };
}

/* ------------------------------------------------------------------ */
/* Look of each material                                               */
/* ------------------------------------------------------------------ */

const GRAD_TEXT: CSSProperties = {
  backgroundImage: "linear-gradient(90deg,#00c2ff,#7a5cff 55%,#ff3df2)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const WINDOW_BG =
  "linear-gradient(160deg,#9fd3f0 0%,#d8eefb 45%,#8fb9d3 100%)";

type Look = {
  /** Backdrop the material is shown on. */
  bg: CSSProperties;
  /** Sample "LOGO" word drawn the way this material looks. */
  text: CSSProperties;
  /** Optional texture laid over the swatch. */
  pattern?: CSSProperties;
};

const LOOKS: Record<MaterialLook, Look> = {
  perforated: {
    bg: { background: WINDOW_BG },
    text: { ...GRAD_TEXT, opacity: 0.85 },
    pattern: {
      backgroundImage:
        "radial-gradient(circle, rgba(0,0,0,.55) 0.9px, transparent 1.4px)",
      backgroundSize: "4px 4px",
    },
  },
  vinyl: {
    bg: { background: WINDOW_BG },
    text: { ...GRAD_TEXT },
  },
  tint: {
    bg: {
      background:
        "linear-gradient(135deg,#1a2430 0%,#0c1118 55%,#27323f 100%)",
    },
    text: { color: "rgba(255,255,255,.35)", letterSpacing: "0.1em" },
    pattern: {
      backgroundImage:
        "linear-gradient(115deg, transparent 38%, rgba(255,255,255,.22) 50%, transparent 62%)",
    },
  },
  wall: {
    bg: {
      background:
        "radial-gradient(rgba(0,0,0,.05) 1px, transparent 1.2px) 0 0/6px 6px, linear-gradient(135deg,#efe6d8,#d9ccb9)",
    },
    text: { ...GRAD_TEXT },
  },
  floor: {
    bg: {
      background:
        "repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 1.5px, transparent 1.5px 34px), linear-gradient(135deg,#b88e62,#8a6340)",
    },
    text: { ...GRAD_TEXT, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.45))" },
  },
  banner: {
    bg: { background: "linear-gradient(135deg,#ffffff,#e5e8ee)" },
    text: { color: "#d62839", fontWeight: 900 },
  },
  frosted: {
    bg: { background: WINDOW_BG },
    text: {
      color: "rgba(255,255,255,.82)",
      textShadow: "0 0 2px rgba(0,0,0,.35), 0 0 10px rgba(255,255,255,.7)",
    },
    pattern: {
      backgroundImage:
        "radial-gradient(rgba(255,255,255,.5) 1px, transparent 1.4px)",
      backgroundSize: "5px 5px",
    },
  },
  armor: {
    bg: {
      background:
        "linear-gradient(135deg,#2b3d4f 0%,#566e86 50%,#24323f 100%)",
    },
    text: {
      color: "rgba(255,255,255,.92)",
      textShadow: "0 0 3px rgba(0,0,0,.5), 0 0 12px rgba(180,220,255,.8)",
    },
    pattern: {
      backgroundImage:
        "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.35) 50%, transparent 65%), radial-gradient(rgba(255,255,255,.28) 1px, transparent 1.4px)",
      backgroundSize: "100% 100%, 4px 4px",
    },
  },
  canvas: {
    bg: {
      backgroundColor: "#eadfc6",
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(0,0,0,.08) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 1px, transparent 1px 3px)",
    },
    text: { color: "#5b3a1e", fontFamily: "Georgia, serif", fontWeight: 700 },
  },
  cutblack: {
    bg: { background: "linear-gradient(135deg,#f4f6f8,#d6dce2)" },
    text: {
      color: "#050505",
      textShadow: "0 1px 0 rgba(255,255,255,.4)",
    },
    pattern: {
      backgroundImage:
        "linear-gradient(115deg, transparent 40%, rgba(255,255,255,.65) 50%, transparent 60%)",
      mixBlendMode: "soft-light",
    },
  },
  cutwhite: {
    bg: { background: "linear-gradient(135deg,#2a3038,#12161b)" },
    text: { color: "#ffffff", textShadow: "0 0 6px rgba(255,255,255,.35)" },
  },
  fabric: {
    bg: { background: "linear-gradient(135deg,#f7f1ea,#e2d8cb)" },
    text: { ...GRAD_TEXT },
    pattern: {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(0,0,0,.09) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(0,0,0,.09) 0 1px, transparent 1px 3px)",
    },
  },
  special: {
    bg: {
      background: "linear-gradient(135deg,#fff1f6,#ffd9e6)",
      border: "2px dashed rgba(217,76,179,.65)",
    },
    text: { color: "#c2307f", fontWeight: 900 },
  },
};

/** Materials printed on a rectangular sheet we draw as a panel. */
const PANEL_LOOKS: MaterialLook[] = ["banner", "canvas", "tint"];

/** CSS filter that makes a logo look like the material it is printed on. */
function logoFilter(look: MaterialLook): string | undefined {
  switch (look) {
    case "cutblack":
      return "brightness(0) drop-shadow(0 1px 1px rgba(0,0,0,.25))";
    case "cutwhite":
      return "brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0,0,0,.5))";
    case "frosted":
      return "brightness(0) invert(1) opacity(.82) drop-shadow(0 0 2px rgba(0,0,0,.35))";
    case "armor":
      return "brightness(0) invert(1) opacity(.9) drop-shadow(0 0 3px rgba(150,200,255,.9))";
    case "perforated":
      return "opacity(.88)";
    case "fabric":
      return "saturate(.95) contrast(.97)";
    default:
      return "drop-shadow(0 1px 2px rgba(0,0,0,.25))";
  }
}

type StageBg = "auto" | "light" | "dark";

function stageStyle(bg: StageBg, look: MaterialLook): CSSProperties {
  if (bg === "dark") return { background: "#14171c" };
  if (bg === "light") {
    return {
      background:
        "repeating-conic-gradient(#dfe3e7 0% 25%, #eff1f3 0% 50%) 50% / 16px 16px",
    };
  }
  return { ...LOOKS[look].bg };
}

function maskStyle(src: string): CSSProperties {
  const u = `url("${src}")`;
  return {
    WebkitMaskImage: u,
    maskImage: u,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  } as CSSProperties;
}

function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

const CSS = `
@keyframes dc-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes dc-pop{0%{transform:scale(.94);opacity:.4}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
@keyframes dc-shine{0%{background-position:-160% 0}100%{background-position:260% 0}}
@keyframes dc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(217,240,0,.5)}50%{box-shadow:0 0 0 9px rgba(217,240,0,0)}}
@keyframes dc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.dc-up{animation:dc-up .55s cubic-bezier(.2,.8,.2,1) both}
.dc-pop{animation:dc-pop .4s ease both}
.dc-mat{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,opacity .2s ease}
.dc-mat:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.35)}
.dc-mat[data-on="true"]{animation:dc-pop .4s ease both}
.dc-cta{animation:dc-pulse 2.4s ease-in-out infinite}
.dc-bar{transition:width .7s cubic-bezier(.2,.8,.2,1)}
.dc-sign{transition:width .5s cubic-bezier(.2,.8,.2,1),height .5s cubic-bezier(.2,.8,.2,1)}
.dc-shine{background-size:220% 100%;animation:dc-shine 3.4s linear infinite}
.dc-bob{animation:dc-bob 2.6s ease-in-out infinite}
.dc-chip{transition:transform .18s ease,background .18s ease,border-color .18s ease}
.dc-chip:hover{transform:translateY(-2px)}
@media (prefers-reduced-motion:reduce){.dc-up,.dc-pop,.dc-cta,.dc-shine,.dc-bob,.dc-mat[data-on="true"]{animation:none}.dc-mat,.dc-bar,.dc-sign,.dc-chip{transition:none}}
`;

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function DecalCalculator() {
  const router = useRouter();
  const { addItem } = useCart();

  const [unit, setUnit] = useState<Unit>("in");
  const [items, setItems] = useState<Item[]>(() => [newItem()]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [jobId, setJobId] = useState<string>(() => uid("job"));
  const [jobName, setJobName] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [notes, setNotes] = useState("");
  const [stageBg, setStageBg] = useState<StageBg>("auto");
  const [uploads, setUploads] = useState<Record<string, UploadSlot>>({});
  const [clean, setClean] = useState<Record<string, { src: string; url: string } | "multiply">>({});
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [today, setToday] = useState("");
  const measuring = useRef<Set<string>>(new Set());
  const cleaning = useRef<Set<string>>(new Set());

  // Browser-only values are read after mount so the server HTML matches.
  useEffect(() => {
    setSaved(readSaved());
    try {
      setIsAdmin(!!window.sessionStorage.getItem("adminToken"));
    } catch {
      /* ignore */
    }
    const d = new Date();
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const factor = unit === "ft" ? 12 : 1;

  const inches = useCallback(
    (v: string) => (Number(v) || 0) * factor,
    [factor],
  );

  const job = useMemo(
    () =>
      calcJob(
        items.map((it) => ({
          material: it.material,
          width: inches(it.w),
          height: inches(it.h),
          quantity: it.qty,
          customPricePerSqFt: Number(it.custom) || 0,
        })),
        { allowCustom: isAdmin },
      ),
    [items, inches, isAdmin],
  );

  /* ---------- autosave (survives refresh) ---------- */
  const snap: Snap = {
    jobId,
    jobName,
    installDate,
    notes,
    unit,
    selectedId: selected?.id ?? "",
    items,
  };
  const hasContent =
    !!jobName ||
    !!notes ||
    items.some((i) => i.w || i.h || i.imageUrl || i.name || i.note);

  const { restored, clear, startOver } = useDraft<Snap>({
    handle: "decal-quote",
    snapshot: snap,
    hasContent,
    restore: (savedDraft) => {
      const s = cleanSnap(savedDraft);
      if (!s) throw new Error("bad draft");
      applySnap(s);
    },
  });

  function applySnap(s: Snap) {
    setItems(s.items);
    setSelectedId(s.selectedId);
    setJobId(s.jobId);
    setJobName(s.jobName);
    setInstallDate(s.installDate);
    setNotes(s.notes);
    setUnit(s.unit);
    setUploads({});
  }

  /* ---------- item helpers ---------- */
  function patch(id: string, p: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  function addNewItem() {
    const it = newItem(selected?.material ?? "full-vinyl");
    setItems((prev) => [...prev, it]);
    setSelectedId(it.id);
    setToast(null);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      if (prev.length === 1) return [newItem()];
      const next = prev.filter((i) => i.id !== id);
      if (id === selectedId) setSelectedId(next[0].id);
      return next;
    });
    setUploads((u) => {
      const { [id]: _drop, ...rest } = u;
      void _drop;
      return rest;
    });
  }

  function switchUnit(next: Unit) {
    if (next === unit) return;
    const conv = (v: string) => {
      const n = Number(v);
      if (!v || !Number.isFinite(n)) return v;
      return fmt(Math.round((next === "ft" ? n / 12 : n * 12) * 100) / 100);
    };
    setItems((prev) => prev.map((i) => ({ ...i, w: conv(i.w), h: conv(i.h) })));
    setUnit(next);
  }

  function setWidth(v: string) {
    if (!selected) return;
    const n = Number(v);
    if (selected.lock && selected.aspect > 0 && n > 0) {
      patch(selected.id, {
        w: v,
        h: fmt(Math.round((n / selected.aspect) * 100) / 100),
        sizeNote: "",
      });
    } else patch(selected.id, { w: v, sizeNote: "" });
  }

  function setHeight(v: string) {
    if (!selected) return;
    const n = Number(v);
    if (selected.lock && selected.aspect > 0 && n > 0) {
      patch(selected.id, {
        h: v,
        w: fmt(Math.round(n * selected.aspect * 100) / 100),
        sizeNote: "",
      });
    } else patch(selected.id, { h: v, sizeNote: "" });
  }

  /* ---------- logo upload + measuring ---------- */
  const slotFor = useCallback(
    (it: Item): UploadSlot => {
      const live = uploads[it.id];
      if (live) return live;
      if (it.imageUrl) {
        return (
          unpackUpload({
            name: it.imageName || "Uploaded artwork",
            type: "image/png",
            url: it.imageUrl,
          }) ?? EMPTY_UPLOAD_SLOT
        );
      }
      return EMPTY_UPLOAD_SLOT;
    },
    [uploads],
  );

  function setSlotFor(id: string) {
    return (u: React.SetStateAction<UploadSlot>) =>
      setUploads((prev) => ({
        ...prev,
        [id]: typeof u === "function" ? u(prev[id] ?? EMPTY_UPLOAD_SLOT) : u,
      }));
  }

  async function pickFile(f: File) {
    const id = sel.id;
    const meta = await readFileMeta(f);
    patch(id, { ...meta, noWhite: false, sizeNote: "" });
    // .ai files can't be drawn in a browser, so they go up as they are.
    if (f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf") {
      void uploadDesign(f, setSlotFor(id), { requirePreviewable: true });
    } else {
      void uploadDesign(f, setSlotFor(id));
    }
  }

  // When an upload finishes, store its link on the item.
  useEffect(() => {
    for (const [id, slot] of Object.entries(uploads)) {
      if (slot.fileUrl && !slot.isUploading) {
        const it = items.find((i) => i.id === id);
        if (it && it.imageUrl !== slot.fileUrl) {
          const fname = (slot.file?.name ?? it.imageName ?? "").toLowerCase();
          const canShow = !slot.file || /\.(png|jpe?g|webp|gif|svg|pdf)$/.test(fname);
          patch(id, {
            imageUrl: slot.fileUrl,
            imageName: slot.file?.name ?? "Artwork",
            aspect: canShow ? 0 : -1,
            // New logo: let its own size fill the boxes again.
            w: "",
            h: "",
            noWhite: false,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads]);

  // Measure each logo once: shape, real size, and white background.
  useEffect(() => {
    for (const it of items) {
      if (!it.imageUrl || it.aspect !== 0 || measuring.current.has(it.id)) continue;
      measuring.current.add(it.id);
      const id = it.id;
      const url = it.imageUrl;
      const done = (img: HTMLImageElement, cors: boolean) => {
        measuring.current.delete(id);
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const a = nw / Math.max(1, nh);
        if (!Number.isFinite(a) || a <= 0) {
          patch(id, { aspect: -1 });
          return;
        }
        let white = false;
        if (cors) white = hasWhiteBox(img);
        setItems((prev) =>
          prev.map((p) => {
            if (p.id !== id || p.imageUrl !== url) return p;
            const base = { ...p, aspect: a, noWhite: white };
            if (!p.w && !p.h) {
              const { wi, hi, note } = sizeFromFile(nw, nh, p);
              const f = unit === "ft" ? 12 : 1;
              return {
                ...base,
                w: fmt(Math.round((wi / f) * 100) / 100),
                h: fmt(Math.round((hi / f) * 100) / 100),
                sizeNote: note,
              };
            }
            const w = Number(p.w);
            const h = w > 0 && p.lock ? fmt(Math.round((w / a) * 100) / 100) : p.h;
            return { ...base, h };
          }),
        );
      };
      const first = new window.Image();
      first.crossOrigin = "anonymous";
      first.onload = () => done(first, true);
      first.onerror = () => {
        const second = new window.Image();
        second.onload = () => done(second, false);
        second.onerror = () => {
          measuring.current.delete(id);
          patch(id, { aspect: -1 });
        };
        second.src = url;
      };
      first.src = url;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Make a copy of a logo with its white box removed, for the preview only.
  useEffect(() => {
    for (const it of items) {
      if (!it.noWhite || !it.imageUrl || it.aspect <= 0) continue;
      const have = clean[it.id];
      if (have === "multiply" || (have && have.src === it.imageUrl)) continue;
      if (cleaning.current.has(it.id)) continue;
      cleaning.current.add(it.id);
      const id = it.id;
      const url = it.imageUrl;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        cleaning.current.delete(id);
        const out = removeWhite(img);
        setClean((c) => ({ ...c, [id]: out ? { src: url, url: out } : "multiply" }));
      };
      img.onerror = () => {
        cleaning.current.delete(id);
        setClean((c) => ({ ...c, [id]: "multiply" }));
      };
      img.src = url;
    }
  }, [items, clean]);

  function previewSrc(it: Item): { src: string; multiply: boolean } {
    if (!it.noWhite) return { src: it.imageUrl, multiply: false };
    const c = clean[it.id];
    if (c && c !== "multiply" && c.src === it.imageUrl) {
      return { src: c.url, multiply: false };
    }
    return { src: it.imageUrl, multiply: true };
  }

  /* ---------- saved jobs ---------- */
  function saveCurrent(silent = false) {
    if (!hasContent) {
      if (!silent) setToast("Add something to your job first.");
      return;
    }
    const name = jobName.trim() || `Job · ${new Date().toLocaleDateString()}`;
    const entry: SavedJob = {
      id: jobId,
      name,
      savedAt: Date.now(),
      total: job.total,
      snap,
    };
    const list = [entry, ...readSaved().filter((j) => j.id !== jobId)];
    const ok = writeSaved(list);
    setSaved(list.slice(0, MAX_SAVED));
    if (!silent) {
      setToast(
        ok
          ? "Job saved on this device. Open it any time from “Saved jobs”."
          : "Couldn't save. Your browser blocked storage.",
      );
    }
  }

  function openSaved(j: SavedJob) {
    if (hasContent && j.id !== jobId) saveCurrent(true);
    applySnap(j.snap);
    setToast(`Opened “${j.name}”.`);
  }

  function deleteSaved(id: string) {
    const list = readSaved().filter((j) => j.id !== id);
    writeSaved(list);
    setSaved(list);
  }

  /* ---------- add to cart ---------- */
  function handleAddToCart() {
    const bad = job.lines.findIndex((l) => l.problem || l.callForQuote);
    if (bad >= 0) {
      const l = job.lines[bad];
      setSelectedId(items[bad].id);
      setToast(
        l.callForQuote
          ? `Item ${bad + 1}: Special Vinyl is priced per job. Call (772) 985-2854 for a quote.`
          : `Item ${bad + 1}: ${l.problem}`,
      );
      return;
    }
    if (installDate && today && installDate < today) {
      setToast("Pick an install date that isn't in the past, or clear it.");
      return;
    }
    if (Object.values(uploads).some((u) => u.isUploading)) {
      setToast("Please wait for your logo to finish uploading.");
      return;
    }
    setToast(null);

    const panels: DecalPanelLine[] = items.map((it, idx) => {
      const mat = DECAL_MATERIALS.find((m) => m.key === it.material);
      const bits: string[] = [];
      if (it.design) bits.push("[DESIGN CHECK REQUESTED: customer wants our graphic designer to review the artwork]");
      if (Number(it.req) > 0 && !(isAdmin && Number(it.custom) > 0)) {
        bits.push(
          `[SPECIAL PRICE REQUEST: customer asks for $${Number(it.req).toFixed(2)}/sq ft. Priced at the normal rate until the shop confirms]`,
        );
      }
      if (it.noWhite) bits.push("[Remove the white background from the logo]");
      if (it.note.trim()) bits.push(it.note.trim());
      return {
        type: "other",
        typeLabel: it.name.trim() || `Item ${idx + 1}`,
        width: inches(it.w),
        height: inches(it.h),
        imageUrl: it.imageUrl || undefined,
        note: bits.length ? bits.join(" ").slice(0, 500) : undefined,
        material: it.material,
        materialLabel: mat?.label ?? it.material,
        quantity: it.qty,
        customPricePerSqFt:
          isAdmin && Number(it.custom) > 0 ? Number(it.custom) : undefined,
      };
    });
    const labels = Array.from(new Set(panels.map((p) => p.materialLabel ?? "")));
    const matSummary = labels.length === 1 ? labels[0] : "Mixed materials";
    const rates = Array.from(new Set(job.lines.map((l) => l.rate)));

    const cartItem: Omit<DecalCartItem, "id" | "addedAt"> = {
      kind: "decal",
      title: `Signage Quote · ${jobName.trim() || matSummary}`,
      subtitle: `${panels.length} ${panels.length === 1 ? "item" : "items"} · ${job.totalAreaSqFt.toFixed(2)} sq ft${job.bundlePercent ? ` · ${job.bundlePercent}% bundle deal` : ""}`,
      thumbnail: "🪟",
      unitLabel:
        rates.length === 1 ? `$${rates[0].toFixed(2)} / sq ft` : "Mixed rates",
      totalPrice: job.total,
      quantity: panels.length,
      panels,
      material: items[0].material,
      materialLabel: matSummary,
      discountPercent: job.bundlePercent,
      pricePerSqFt: job.lines[0]?.rate ?? 0,
      totalAreaSqFt: job.totalAreaSqFt,
      subtotal: job.subtotal,
      taxAmount: job.taxAmount,
      notes: notes.trim() || undefined,
      jobName: jobName.trim() || undefined,
      installDate: installDate || undefined,
      editHref: "/decal-quote",
    };

    saveCurrent(true); // keep a copy under "Saved jobs"
    addItem(cartItem);
    clear();
    router.push("/cart");
  }

  /* ---------- render ---------- */
  const sel = selected;
  const selIdx = items.indexOf(sel);
  const selMat = DECAL_MATERIALS.find((m) => m.key === sel.material) ?? DECAL_MATERIALS[0];
  const selLine = job.lines[selIdx];
  const slot = slotFor(sel);
  const selPrev = previewSrc(sel);
  const barMax = BUNDLE_TIERS[BUNDLE_TIERS.length - 1].minSqFt;
  const barPct = Math.min(100, (job.totalAreaSqFt / barMax) * 100);

  return (
    <section className="relative">
      <style>{CSS}</style>
      <div className="border-b border-border-soft bg-background-soft/60">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-1 text-foreground-muted hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Home
          </Link>
          <span className="text-foreground-muted/40">/</span>
          <span className="font-medium">Signage Quote</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="dc-up mb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
            Made in Stuart, FL · Installation included
          </p>
          <h1 className="font-headline text-2xl font-bold sm:text-3xl">
            Decal, Banner &amp; Signage Quote
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Upload your logo. We size it for you. Pick a material and see the price.
          </p>
        </div>

        {restored && (
          <div className="mb-4">
            <DraftNote onStartOver={startOver} />
          </div>
        )}

        {/* ───────────── all items, with their price ───────────── */}
        <div className="dc-up mb-5 flex gap-2 overflow-x-auto pb-1" style={{ animationDelay: "60ms" }}>
          {items.map((it, idx) => {
            const ln = job.lines[idx];
            const m = DECAL_MATERIALS.find((x) => x.key === it.material);
            const on = it.id === sel.id;
            return (
              <div
                key={it.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(it.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(it.id);
                  }
                }}
                className={`dc-chip flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border p-2 pr-2.5 ${
                  on
                    ? "border-accent bg-accent/10 ring-1 ring-accent"
                    : "border-border-soft bg-white/4 hover:bg-white/8"
                }`}
              >
                <Thumb item={it} look={m?.look ?? "vinyl"} src={previewSrc(it)} />
                <div className="min-w-[88px]">
                  <div className="max-w-[130px] truncate text-xs font-bold">
                    {it.name.trim() || `Item ${idx + 1}`}
                  </div>
                  <div className="text-[10px] text-foreground-muted">
                    {it.w && it.h ? `${it.w}×${it.h} ${unit}` : "No size yet"}
                    {it.qty > 1 ? ` · ×${it.qty}` : ""}
                  </div>
                  <div className="font-mono text-xs font-bold text-cyan-300">
                    {ln?.callForQuote
                      ? "Call"
                      : ln && ln.amount > 0 && !ln.problem
                        ? `$${ln.amount.toFixed(2)}`
                        : "$0.00"}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove item ${idx + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(it.id);
                  }}
                  className="self-start rounded-md px-1 text-xs text-rose-300 hover:bg-rose-500/10"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addNewItem}
            className="dc-chip flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-accent/60 bg-accent/5 px-4 text-sm font-bold text-accent hover:bg-accent/10"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-lg leading-none text-black">+</span>
            Add another logo
          </button>
        </div>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          {/* ───────────── COL 1: upload + size ───────────── */}
          <div className="space-y-5">
            <Card n={1} title="Upload your logo" delay={80}>
              <UploadBox
                slot={slot}
                onSelect={(f) => void pickFile(f)}
                onClear={() => {
                  setUploads((u) => ({ ...u, [sel.id]: EMPTY_UPLOAD_SLOT }));
                  patch(sel.id, { imageUrl: "", imageName: "", aspect: 0, w: "", h: "", sizeNote: "", noWhite: false });
                }}
                accept={ACCEPT_VECTOR}
                hint="SVG · PDF · AI · EPS · CDR · DXF · PNG · JPG"
              />
              <p className="mt-2 text-[11px] text-foreground-muted">
                Vector files (SVG, PDF, AI, EPS) print the sharpest. A PNG with no
                background keeps its shape. No logo yet? Skip it and tell us in the note.
              </p>

              {sel.imageUrl && sel.aspect > 0 && (
                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={sel.noWhite}
                    onChange={(e) => patch(sel.id, { noWhite: e.target.checked })}
                    className="h-4 w-4 accent-[#d9f000]"
                  />
                  <span>
                    <b>Remove the white box</b> around my logo
                  </span>
                </label>
              )}
              {sel.imageUrl && sel.aspect === -1 && (
                <p className="mt-3 rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
                  We can&apos;t draw this file type here, but we got it. We&apos;ll
                  use it as is. Type your size below.
                </p>
              )}

              <label
                className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  sel.design
                    ? "border-emerald-400/60 bg-emerald-500/10"
                    : "border-border-soft bg-white/4 hover:bg-white/8"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sel.design}
                  onChange={(e) => patch(sel.id, { design: e.target.checked })}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm font-black transition ${
                    sel.design
                      ? "scale-110 border-emerald-300 bg-emerald-400 text-black"
                      : "border-border-strong text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span>
                  <span className="block text-sm font-bold">
                    Have a pro designer check my artwork
                  </span>
                  <span className="block text-[11px] text-foreground-muted">
                    Optional. We look it over and call you if anything needs fixing.
                  </span>
                </span>
              </label>
            </Card>

            <Card n={2} title="Size & quantity" delay={140}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs text-foreground-muted">
                  {sel.sizeNote ? (
                    <b className={sel.sizeNote.startsWith("Estimated") ? "text-amber-300" : "text-emerald-300"}>
                      {sel.sizeNote}
                    </b>
                  ) : (
                    "Type the size, or upload a logo and we fill it in."
                  )}
                </span>
                <div className="inline-flex shrink-0 rounded-full border border-border-soft bg-background/60 p-0.5 text-xs font-semibold">
                  {(["in", "ft"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => switchUnit(u)}
                      className={`rounded-full px-3 py-1 transition ${
                        unit === u ? "bg-accent text-black" : "text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      {u === "in" ? "Inches" : "Feet"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label={`Width (${unit})`} value={sel.w} onChange={setWidth} />
                <NumberField label={`Height (${unit})`} value={sel.h} onChange={setHeight} />
              </div>

              {sel.aspect > 0 && (
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={sel.lock}
                    onChange={(e) => patch(sel.id, { lock: e.target.checked })}
                    className="h-4 w-4 accent-[#d9f000]"
                  />
                  Keep my logo&apos;s shape (changing one side fits the other)
                </label>
              )}

              {selMat.maxSideIn && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-foreground-muted">Banner sizes:</span>
                  {[
                    [24, 48],
                    [36, 72],
                    [48, 96],
                    [60, 120],
                  ].map(([a, b]) => (
                    <button
                      key={`${a}x${b}`}
                      type="button"
                      onClick={() =>
                        patch(sel.id, {
                          w: fmt(unit === "ft" ? b / 12 : b),
                          h: fmt(unit === "ft" ? a / 12 : a),
                          lock: false,
                          sizeNote: "",
                        })
                      }
                      className="rounded-full border border-border-soft bg-white/5 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/10"
                    >
                      {b / 12}×{a / 12} ft
                    </button>
                  ))}
                </div>
              )}

              {selLine?.problem && inches(sel.w) > 0 && inches(sel.h) > 0 && (
                <div className="dc-pop mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {selLine.problem}
                </div>
              )}

              <div className="mt-4">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Quantity (how many of this one)
                </span>
                <div className="flex items-center gap-1 rounded-xl border border-border-soft bg-background/60 p-1 sm:w-48">
                  <button
                    type="button"
                    onClick={() => patch(sel.id, { qty: Math.max(1, sel.qty - 1) })}
                    className="grid h-9 w-9 place-items-center rounded-lg text-lg font-bold text-foreground-muted hover:bg-white/10"
                  >
                    −
                  </button>
                  <span key={sel.qty} className="dc-pop flex-1 text-center text-base font-bold tabular-nums">
                    {sel.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => patch(sel.id, { qty: Math.min(999, sel.qty + 1) })}
                    className="grid h-9 w-9 place-items-center rounded-lg text-lg font-bold text-foreground-muted hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Name this item (optional)
                </span>
                <input
                  type="text"
                  value={sel.name}
                  onChange={(e) => patch(sel.id, { name: e.target.value.slice(0, 60) })}
                  placeholder="e.g., Front entrance, Side window"
                  className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm placeholder:text-foreground-muted/60 outline-none ring-accent/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Note for this item (optional)
                </span>
                <textarea
                  value={sel.note}
                  onChange={(e) => patch(sel.id, { note: e.target.value.slice(0, 300) })}
                  rows={2}
                  placeholder="Anything we should know about this one…"
                  className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm placeholder:text-foreground-muted/60 outline-none ring-accent/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </label>

              {/* Phones: the big preview is far below, so show one here. */}
              <div className="mt-4 lg:hidden">
                <Stage
                  item={sel}
                  look={selMat.look}
                  src={selPrev}
                  wIn={inches(sel.w)}
                  hIn={inches(sel.h)}
                  unit={unit}
                  bg={stageBg}
                  compact
                />
              </div>
            </Card>
          </div>

          {/* ───────────── COL 2: material, special price, install ───────────── */}
          <div className="space-y-5">
            <Card n={3} title={`Material · ${sel.name.trim() || `Item ${selIdx + 1}`}`} delay={200}>
              <div className="grid grid-cols-2 gap-2.5">
                {DECAL_MATERIALS.map((m) => {
                  const on = sel.material === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      data-on={on}
                      onClick={() => patch(sel.id, { material: m.key })}
                      className={`dc-mat flex flex-col gap-1 rounded-xl border p-2 text-left ${
                        on
                          ? "border-accent bg-accent/10 ring-1 ring-accent"
                          : "border-border-soft bg-white/4 opacity-85 hover:opacity-100"
                      }`}
                    >
                      <Swatch look={m.look} />
                      <span className="mt-1 text-[12px] font-bold leading-tight">{m.label}</span>
                      <span
                        className={`text-sm font-bold ${m.quoteOnly ? "text-rose-300" : "text-cyan-300"}`}
                      >
                        {m.quoteOnly ? "Custom pricing" : `$${m.pricePerSqFt.toFixed(2)}/sq ft`}
                      </span>
                      <span className="text-[10.5px] leading-snug text-foreground-muted">{m.blurb}</span>
                    </button>
                  );
                })}
              </div>

              {selMat.quoteOnly && !isAdmin && (
                <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
                  Special Vinyl is priced per job.{" "}
                  <a href="tel:7729852854" className="font-bold underline">
                    Call (772) 985-2854
                  </a>{" "}
                  for a quote.
                </div>
              )}

              {isAdmin ? (
                <div className="mt-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-fuchsia-200">
                    Shop special price ($ / sq ft) · admin only
                  </label>
                  <input
                    type="number"
                    value={sel.custom}
                    onChange={(e) => patch(sel.id, { custom: e.target.value.slice(0, 8) })}
                    min={0}
                    step="0.01"
                    placeholder={selMat.quoteOnly ? "Required for Special Vinyl" : "Leave blank to use the normal rate"}
                    className="w-full rounded-xl border border-fuchsia-400/40 bg-white/4 px-4 py-2.5 text-sm outline-none ring-fuchsia-400/40 focus:ring-2"
                    suppressHydrationWarning
                  />
                  <p className="mt-1.5 text-[11px] text-fuchsia-100/80">
                    This changes the real price. You&apos;re signed in to admin on this browser.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-border-soft bg-white/4 p-3">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Ask for a special price (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground-muted">$</span>
                    <input
                      type="number"
                      value={sel.req}
                      onChange={(e) => patch(sel.id, { req: e.target.value.slice(0, 8) })}
                      min={0}
                      step="0.01"
                      placeholder="per sq ft you'd like"
                      className="w-full rounded-xl border border-border-soft bg-white/4 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
                      suppressHydrationWarning
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground-muted">
                    Big job or repeat customer? Tell us your price. We&apos;ll review it
                    and call you. Your quote stays at the normal price until we say yes.
                  </p>
                </div>
              )}
            </Card>

            <Card n={4} title="Preferred install date (optional)" delay={260}>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Job name
                </span>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value.slice(0, 80))}
                  placeholder="e.g., Front window lettering"
                  className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm placeholder:text-foreground-muted/60 outline-none ring-accent/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Install date
                </span>
                <input
                  type="date"
                  value={installDate}
                  min={today || undefined}
                  onChange={(e) => setInstallDate(e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm outline-none ring-accent/40 focus:ring-2 sm:w-64"
                  suppressHydrationWarning
                />
              </label>
              <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                Your date is a request, not a promise. Weather and our install
                schedule can change it. For example, an outdoor install can&apos;t
                happen in the rain, so we&apos;ll call you to reschedule.
              </p>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Project notes
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Install location, deadline, special instructions…"
                  className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-sm placeholder:text-foreground-muted/60 outline-none ring-accent/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </label>
            </Card>
          </div>

          {/* ───────────── COL 3: preview + quote ───────────── */}
          <div className="space-y-5 lg:sticky lg:top-20">
            <section className="dc-up hidden rounded-2xl border border-border-soft bg-white/4 p-4 lg:block" style={{ animationDelay: "140ms" }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-headline text-sm font-bold uppercase tracking-wider">
                  Live preview
                </h2>
                <div className="inline-flex rounded-full border border-border-soft bg-background/60 p-0.5 text-[11px] font-semibold">
                  {(["auto", "light", "dark"] as StageBg[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setStageBg(b)}
                      className={`rounded-full px-2.5 py-1 capitalize transition ${
                        stageBg === b ? "bg-accent text-black" : "text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      {b === "auto" ? "Scene" : b}
                    </button>
                  ))}
                </div>
              </div>
              <Stage
                item={sel}
                look={selMat.look}
                src={selPrev}
                wIn={inches(sel.w)}
                hIn={inches(sel.h)}
                unit={unit}
                bg={stageBg}
              />
              <p className="mt-2 text-[11px] text-foreground-muted">
                Shown at true shape. The white sheet is a letter page (8.5×11 in) for scale.
              </p>
            </section>

            <section className="dc-up rounded-2xl border border-border-soft bg-white/4 p-4" style={{ animationDelay: "200ms" }}>
              <h2 className="mb-3 font-headline text-sm font-bold uppercase tracking-wider">
                Your quote
              </h2>

              <ul className="space-y-2">
                {items.map((it, idx) => {
                  const ln = job.lines[idx];
                  const m = DECAL_MATERIALS.find((x) => x.key === it.material);
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(it.id)}
                        className={`dc-chip flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-xs ${
                          it.id === sel.id ? "bg-accent/10 ring-1 ring-accent/60" : "bg-white/5 hover:bg-white/8"
                        }`}
                      >
                        <Thumb item={it} look={m?.look ?? "vinyl"} src={previewSrc(it)} size={48} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {it.name.trim() || `Item ${idx + 1}`}
                          </span>
                          <span className="block truncate text-[11px] text-foreground-muted">
                            {m?.label}
                            {it.w && it.h ? ` · ${it.w}×${it.h} ${unit}` : ""}
                            {it.qty > 1 ? ` · ×${it.qty}` : ""}
                          </span>
                          {ln.rate > 0 && !ln.problem && (
                            <span className="block text-[10px] text-foreground-muted">
                              {ln.totalAreaSqFt.toFixed(2)} sq ft @ ${ln.rate.toFixed(2)}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-sm font-bold text-cyan-300">
                          {ln.callForQuote ? "Call" : ln.problem ? "—" : `$${ln.amount.toFixed(2)}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Bundle deal */}
              <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-200">Bundle deal</span>
                  <span className="font-mono text-emerald-200">
                    {job.bundlePercent > 0 ? `${job.bundlePercent}% off` : "Save up to 20%"}
                  </span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="dc-bar dc-shine h-full rounded-full"
                    style={{
                      width: `${barPct}%`,
                      backgroundImage:
                        "linear-gradient(90deg,#34d399,#d9f000,#34d399)",
                    }}
                  />
                </div>
                <div className="relative mt-1 h-4 text-[10px] text-emerald-100/80">
                  {BUNDLE_TIERS.map((t) => (
                    <span
                      key={t.minSqFt}
                      className="absolute -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${(t.minSqFt / barMax) * 100 - (t.minSqFt === barMax ? 6 : 0)}%` }}
                    >
                      {t.minSqFt}+ · {t.pct}%
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-emerald-100">
                  {job.nextTier
                    ? job.bundlePercent > 0
                      ? `You save $${job.bundleDiscount.toFixed(2)}. Add ${job.nextTier.moreSqFt.toFixed(1)} more sq ft to save ${job.nextTier.pct}%.`
                      : `Add ${job.nextTier.moreSqFt.toFixed(1)} more sq ft to save ${job.nextTier.pct}%.`
                    : `Best price unlocked. You save $${job.bundleDiscount.toFixed(2)}.`}
                </p>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-border-soft pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Total area</span>
                  <span className="font-mono">{job.totalAreaSqFt.toFixed(2)} sq ft</span>
                </div>
                {job.bundleDiscount > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground-muted">Items</span>
                      <span className="font-mono">${job.gross.toFixed(2)}</span>
                    </div>
                    <div className="dc-pop flex items-center justify-between text-emerald-300">
                      <span>Bundle deal ({job.bundlePercent}%)</span>
                      <span className="font-mono">−${job.bundleDiscount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Subtotal</span>
                  <span className="font-mono font-bold text-cyan-300">${job.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">
                    Tax ({(TAX_RATE * 100).toFixed(0)}% Martin County)
                  </span>
                  <span className="font-mono font-bold text-cyan-300">${job.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border-soft pt-2 text-lg">
                  <span className="font-black">Total</span>
                  <span key={job.total} className="dc-pop font-mono font-black text-highlight">
                    ${job.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className={`mt-4 w-full rounded-md accent-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110 ${
                  job.total > 0 && !job.blocked ? "dc-cta" : ""
                }`}
              >
                Add to Cart{job.total > 0 ? ` · $${job.total.toFixed(2)}` : ""}
              </button>
              <button
                type="button"
                onClick={() => saveCurrent(false)}
                className="mt-2 w-full rounded-md border border-border-strong bg-white/5 px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-wider transition hover:bg-white/10"
              >
                💾 Save this job for later
              </button>
              <p className="mt-2 text-[11px] text-foreground-muted">
                We also keep your edits automatically on this device, so a refresh won&apos;t lose them.
              </p>

              {toast && (
                <div
                  key={toast}
                  role="status"
                  className="dc-pop mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                >
                  {toast}
                </div>
              )}
            </section>

            {saved.length > 0 && (
              <section className="dc-up rounded-2xl border border-border-soft bg-white/4 p-4">
                <h2 className="mb-3 font-headline text-sm font-bold uppercase tracking-wider">
                  Saved jobs
                </h2>
                <ul className="space-y-2">
                  {saved.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{j.name}</div>
                        <div className="text-[11px] text-foreground-muted">
                          {j.snap.items.length} {j.snap.items.length === 1 ? "item" : "items"}
                          {j.total > 0 ? ` · $${j.total.toFixed(2)}` : ""} ·{" "}
                          {new Date(j.savedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSaved(j)}
                        className="rounded-md bg-accent px-2.5 py-1 font-bold text-black hover:brightness-110"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSaved(j.id)}
                        aria-label={`Delete ${j.name}`}
                        className="rounded-md px-1.5 py-1 text-rose-300 hover:bg-rose-500/10"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Image helpers (browser only)                                        */
/* ------------------------------------------------------------------ */

function drawToCanvas(img: HTMLImageElement) {
  const max = 1200;
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { c, ctx };
}

/** True when the logo's corners are solid white (a white box around it). */
function hasWhiteBox(img: HTMLImageElement): boolean {
  try {
    const d = drawToCanvas(img);
    if (!d) return false;
    const { c, ctx } = d;
    const pts: [number, number][] = [
      [0, 0],
      [c.width - 1, 0],
      [0, c.height - 1],
      [c.width - 1, c.height - 1],
    ];
    return pts.every(([x, y]) => {
      const p = ctx.getImageData(x, y, 1, 1).data;
      return p[3] > 250 && p[0] > 242 && p[1] > 242 && p[2] > 242;
    });
  } catch {
    return false; // image from another site we can't read
  }
}

/** A copy of the logo where near-white turns see-through. */
function removeWhite(img: HTMLImageElement): string | null {
  try {
    const d = drawToCanvas(img);
    if (!d) return null;
    const { c, ctx } = d;
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const low = Math.min(px[i], px[i + 1], px[i + 2]);
      if (low >= 246) px[i + 3] = 0;
      else if (low >= 225) px[i + 3] = Math.round(px[i + 3] * ((246 - low) / 21));
    }
    ctx.putImageData(data, 0, 0);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Preview pieces                                                      */
/* ------------------------------------------------------------------ */

type Src = { src: string; multiply: boolean };

/** Big preview: the logo at its true shape, drawn like the material. */
function Stage({
  item,
  look,
  src,
  wIn,
  hIn,
  unit,
  bg,
  compact,
}: {
  item: Item;
  look: MaterialLook;
  src: Src;
  wIn: number;
  hIn: number;
  unit: Unit;
  bg: StageBg;
  compact?: boolean;
}) {
  const ready = wIn > 0 && hIn > 0;
  // Stage is 4:3. Fit the sign into 76% of it, keeping its true shape.
  const STAGE = 4 / 3;
  const box = 0.76;
  let pw = 0;
  let ph = 0;
  if (ready) {
    if (wIn / hIn >= STAGE) {
      pw = box;
      ph = box * STAGE * (hIn / wIn);
    } else {
      ph = box;
      pw = (box / STAGE) * (wIn / hIn);
    }
  }
  // US letter paper (8.5 × 11 in) at the same scale, for a feel of the size.
  const paperW = ready ? pw * (8.5 / wIn) : 0;
  const paperH = ready ? ph * (11 / hIn) : 0;
  const showPaper = ready && paperW >= 0.04 && paperW <= 0.4 && paperH <= 0.7;

  const darkScene =
    bg === "dark" || (bg === "auto" && (look === "cutwhite" || look === "tint" || look === "armor"));
  const labelColor = darkScene ? "#d9f000" : "#0b5560";
  const isPanel = PANEL_LOOKS.includes(look);
  const hasImg = !!item.imageUrl && item.aspect > 0;
  const filter = logoFilter(look);
  const pattern = LOOKS[look].pattern;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border-soft ${compact ? "aspect-[4/3] max-h-64" : "aspect-[4/3]"}`}
      style={stageStyle(bg, look)}
    >
      {!ready ? (
        <div
          className="absolute inset-0 grid place-items-center px-6 text-center text-sm"
          style={{ color: darkScene ? "#9aa3ad" : "#4b5560" }}
        >
          <span className="dc-bob">Upload a logo or enter a size to see your sign</span>
        </div>
      ) : (
        <>
          <div
            className="dc-sign absolute"
            style={{
              left: "50%",
              top: "50%",
              width: `${pw * 100}%`,
              height: `${ph * 100}%`,
              transform: "translate(-50%,-50%)",
            }}
          >
            {/* the sheet itself, only for banners, canvas and tint */}
            {isPanel && (
              <div
                className="absolute inset-0 rounded-[3px] shadow-[0_8px_28px_rgba(0,0,0,.35)]"
                style={LOOKS[look].bg}
              >
                {look === "banner" && <Grommets />}
              </div>
            )}

            {/* cut line around the logo */}
            {!isPanel && (
              <div
                className="absolute inset-0 rounded-[2px]"
                style={{
                  outline: `1.5px dashed ${darkScene ? "rgba(217,240,0,.55)" : "rgba(11,85,96,.5)"}`,
                  outlineOffset: "2px",
                }}
              />
            )}

            {hasImg ? (
              <div key={src.src} className="dc-pop absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src.src}
                  alt="Your logo at its true size"
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{
                    filter,
                    mixBlendMode: src.multiply ? "multiply" : undefined,
                  }}
                  draggable={false}
                />
                {pattern && (
                  <div
                    className={`absolute inset-0 ${look === "cutblack" || look === "armor" || look === "tint" ? "dc-shine" : ""}`}
                    style={{ ...pattern, ...maskStyle(src.src), pointerEvents: "none" }}
                  />
                )}
              </div>
            ) : item.imageUrl && item.aspect === -1 ? (
              <div className="absolute inset-0 grid place-items-center rounded-[3px] border border-dashed border-black/30 bg-white/70 px-2 text-center text-[11px] font-bold text-slate-700">
                <span>
                  <span className="block text-base">📄</span>
                  {item.imageName.split(".").pop()?.toUpperCase() || "FILE"} file received
                </span>
              </div>
            ) : (
              <div
                className="absolute inset-0 grid place-items-center rounded-[3px] border border-dashed px-3 text-center text-[11px] font-semibold"
                style={{
                  borderColor: darkScene ? "rgba(255,255,255,.3)" : "rgba(0,0,0,.25)",
                  color: darkScene ? "#cbd5df" : "#6b7480",
                }}
              >
                Your logo shows here
              </div>
            )}

            {/* width label */}
            <div className="pointer-events-none absolute -top-6 left-0 right-0 flex items-center justify-center gap-1 text-[11px] font-bold" style={{ color: labelColor }}>
              <span className="h-px flex-1" style={{ background: labelColor, opacity: 0.5 }} />
              <span className="font-mono">{fmtDim(wIn, unit)}</span>
              <span className="h-px flex-1" style={{ background: labelColor, opacity: 0.5 }} />
            </div>
            {/* height label */}
            <div className="pointer-events-none absolute -right-7 bottom-0 top-0 flex flex-col items-center justify-center gap-1 text-[11px] font-bold" style={{ color: labelColor }}>
              <span className="w-px flex-1" style={{ background: labelColor, opacity: 0.5 }} />
              <span className="font-mono [writing-mode:vertical-rl]">{fmtDim(hIn, unit)}</span>
              <span className="w-px flex-1" style={{ background: labelColor, opacity: 0.5 }} />
            </div>
          </div>

          {showPaper && (
            <div
              className="absolute bottom-2 left-2 rounded-[2px] border border-black/25 bg-white/90"
              title="US letter paper, same scale"
              style={{ width: `${paperW * 100}%`, height: `${paperH * 100}%` }}
            />
          )}
        </>
      )}
    </div>
  );
}

function fmtDim(inches: number, unit: Unit): string {
  if (unit === "ft") return `${fmt(Math.round((inches / 12) * 100) / 100)} ft`;
  return `${fmt(Math.round(inches * 100) / 100)} in`;
}

function Grommets() {
  const spots: [string, string][] = [
    ["4%", "8%"],
    ["50%", "8%"],
    ["96%", "8%"],
    ["4%", "92%"],
    ["50%", "92%"],
    ["96%", "92%"],
  ];
  return (
    <>
      {spots.map(([l, t]) => (
        <span
          key={`${l}${t}`}
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/30 bg-neutral-300"
          style={{ left: l, top: t }}
        />
      ))}
    </>
  );
}

/** A little picture of each material, with a sample word drawn its way. */
function Swatch({ look }: { look: MaterialLook }) {
  const L = LOOKS[look];
  return (
    <span
      className="relative grid h-[52px] w-full place-items-center overflow-hidden rounded-lg border border-black/15"
      style={L.bg}
      aria-hidden
    >
      {L.pattern && (
        <span
          className={`absolute inset-0 ${look === "tint" || look === "armor" ? "dc-shine" : ""}`}
          style={L.pattern}
        />
      )}
      {look === "banner" && <Grommets />}
      <span
        className="relative text-[17px] font-black tracking-wide"
        style={L.text}
      >
        {look === "special" ? "$ ?" : look === "tint" ? "TINT" : "LOGO"}
      </span>
    </span>
  );
}

/** Small picture of an item: its true shape, material look and logo. */
function Thumb({
  item,
  look,
  src,
  size = 44,
}: {
  item: Item;
  look: MaterialLook;
  src: Src;
  size?: number;
}) {
  const w = Number(item.w) || 0;
  const h = Number(item.h) || 0;
  const r = w > 0 && h > 0 ? w / h : 1;
  const tw = r >= 1 ? size : size * r;
  const th = r >= 1 ? size / r : size;
  const isPanel = PANEL_LOOKS.includes(look);
  const dark = look === "cutwhite" || look === "armor" || look === "tint";
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-md"
      style={{
        width: size,
        height: size,
        background: dark ? "#1b2128" : "#e7eaee",
      }}
    >
      <span
        className="relative block overflow-hidden rounded-[2px]"
        style={{
          width: Math.max(14, tw * 0.86),
          height: Math.max(14, th * 0.86),
          ...(isPanel ? LOOKS[look].bg : {}),
        }}
      >
        {item.imageUrl && item.aspect > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src.src}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              filter: logoFilter(look),
              mixBlendMode: src.multiply ? "multiply" : undefined,
            }}
            draggable={false}
          />
        ) : item.imageUrl ? (
          <span className="absolute inset-0 grid place-items-center text-[10px]">📄</span>
        ) : null}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small layout helpers                                                */
/* ------------------------------------------------------------------ */

function Card({
  n,
  title,
  delay = 0,
  children,
}: {
  n?: number;
  title: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section
      className="dc-up rounded-2xl border border-border-soft bg-white/4 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="mb-3 flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wider">
        {n && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-black">
            {n}
          </span>
        )}
        <span className="min-w-0 truncate">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 10))}
        placeholder="0"
        min={0}
        step="any"
        className="w-full rounded-xl border border-border-soft bg-white/4 px-4 py-3 text-lg font-bold tabular-nums outline-none ring-accent/40 focus:ring-2"
        suppressHydrationWarning
      />
    </label>
  );
}
