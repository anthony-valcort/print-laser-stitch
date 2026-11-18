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
  DECAL_MATERIALS,
  TAX_RATE,
  calcJob,
  type MaterialKey,
  type MaterialLook,
} from "@/lib/decal-pricing";
import { useCart } from "@/lib/cart-store";
import type { DecalCartItem, DecalPanelLine } from "@/lib/cart-types";
import {
  ACCEPT_PREVIEWABLE_DESIGN_FILES,
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
  /** Logo width ÷ height (0 = not measured yet). */
  aspect: number;
  /** Keep the logo's proportions when one side changes. */
  lock: boolean;
  note: string;
  /** Shop admin only. */
  custom: string;
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
  };
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
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
      aspect: Number.isFinite(aspect) && aspect > 0 && aspect < 100 ? aspect : 0,
      lock: o.lock !== false,
      note: str(o.note, 500),
      custom: str(o.custom, 10),
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
/* Look of each material in the preview                                */
/* ------------------------------------------------------------------ */

function lookStyle(look: MaterialLook): CSSProperties {
  switch (look) {
    case "banner":
      return {
        background: "linear-gradient(135deg,#fbfbfb,#e9ebef)",
        outline: "1px dashed rgba(0,0,0,.28)",
        outlineOffset: "-9px",
      };
    case "frosted":
      return {
        background:
          "radial-gradient(rgba(255,255,255,.55) 1px, transparent 1.4px) 0 0/5px 5px, linear-gradient(135deg, rgba(255,255,255,.62), rgba(255,255,255,.3))",
        backdropFilter: "blur(5px)",
        border: "1px solid rgba(255,255,255,.7)",
      };
    case "canvas":
      return {
        backgroundColor: "#eee6d4",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(0,0,0,.06) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 1px, transparent 1px 3px)",
      };
    case "perforated":
      return {
        backgroundColor: "#dfe7ee",
        backgroundImage:
          "radial-gradient(circle, rgba(0,0,0,.4) 1px, transparent 1.6px)",
        backgroundSize: "5px 5px",
      };
    case "tint":
      return {
        background:
          "linear-gradient(135deg, rgba(14,22,32,.82), rgba(14,22,32,.58))",
      };
    case "wall":
      return {
        background: "linear-gradient(135deg,#e7ddcf,#d5c9b8)",
      };
    case "special":
      return {
        background: "linear-gradient(135deg,#fff1f6,#ffe1ec)",
        border: "2px dashed rgba(217,76,179,.6)",
      };
    default:
      return { background: "linear-gradient(135deg,#fafafa,#e3e7ec)" };
  }
}

type StageBg = "light" | "dark" | "window";

function stageStyle(bg: StageBg): CSSProperties {
  if (bg === "dark") return { background: "#14171c" };
  if (bg === "window")
    return {
      background:
        "linear-gradient(160deg,#9fd3f0 0%,#cfe9f7 45%,#8fb9d3 100%)",
    };
  return {
    background:
      "linear-gradient(#e9ecef,#e9ecef), repeating-conic-gradient(#d9dde1 0% 25%, #eceff1 0% 50%) 50% / 16px 16px",
    backgroundBlendMode: "normal",
  };
}

function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

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
  const [stageBg, setStageBg] = useState<StageBg>("light");
  const [uploads, setUploads] = useState<Record<string, UploadSlot>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [today, setToday] = useState("");
  const measuring = useRef<Set<string>>(new Set());

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
      patch(selected.id, { w: v, h: fmt(Math.round((n / selected.aspect) * 100) / 100) });
    } else patch(selected.id, { w: v });
  }

  function setHeight(v: string) {
    if (!selected) return;
    const n = Number(v);
    if (selected.lock && selected.aspect > 0 && n > 0) {
      patch(selected.id, { h: v, w: fmt(Math.round(n * selected.aspect * 100) / 100) });
    } else patch(selected.id, { h: v });
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
        [id]:
          typeof u === "function" ? u(prev[id] ?? EMPTY_UPLOAD_SLOT) : u,
      }));
  }

  // When an upload finishes, store its link on the item.
  useEffect(() => {
    for (const [id, slot] of Object.entries(uploads)) {
      if (slot.fileUrl && !slot.isUploading) {
        const it = items.find((i) => i.id === id);
        if (it && it.imageUrl !== slot.fileUrl) {
          patch(id, {
            imageUrl: slot.fileUrl,
            imageName: slot.file?.name ?? "Artwork",
            aspect: 0,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads]);

  // Measure each logo once so "keep proportions" and the preview are exact.
  useEffect(() => {
    for (const it of items) {
      if (!it.imageUrl || it.aspect > 0 || measuring.current.has(it.id)) continue;
      measuring.current.add(it.id);
      const img = new window.Image();
      img.onload = () => {
        measuring.current.delete(it.id);
        const a = img.naturalWidth / Math.max(1, img.naturalHeight);
        if (!Number.isFinite(a) || a <= 0) return;
        setItems((prev) =>
          prev.map((p) => {
            if (p.id !== it.id || p.imageUrl !== it.imageUrl) return p;
            const w = Number(p.w);
            // A fresh logo with a width already typed: fit the height to it.
            const h = w > 0 && p.lock ? fmt(Math.round((w / a) * 100) / 100) : p.h;
            return { ...p, aspect: a, h };
          }),
        );
      };
      img.onerror = () => measuring.current.delete(it.id);
      img.src = it.imageUrl;
    }
  }, [items]);

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
          : "Couldn't save — your browser blocked storage.",
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
          ? `Item ${bad + 1}: Special Vinyl is priced per job — call (772) 985-2854 for a quote.`
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
      return {
        type: "other",
        typeLabel: it.name.trim() || `Item ${idx + 1}`,
        width: inches(it.w),
        height: inches(it.h),
        imageUrl: it.imageUrl || undefined,
        note: it.note.trim() || undefined,
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
      subtitle: `${panels.length} ${panels.length === 1 ? "item" : "items"} · ${job.totalAreaSqFt.toFixed(2)} sq ft`,
      thumbnail: "🪟",
      unitLabel:
        rates.length === 1 ? `$${rates[0].toFixed(2)} / sq ft` : "Mixed rates",
      totalPrice: job.total,
      quantity: panels.length,
      panels,
      material: items[0].material,
      materialLabel: matSummary,
      discountPercent: 0,
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
  const selMat = DECAL_MATERIALS.find((m) => m.key === sel.material) ?? DECAL_MATERIALS[0];
  const selLine = job.lines[items.indexOf(sel)];
  const slot = slotFor(sel);

  return (
    <section className="relative">
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
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
            Made in Stuart, FL · Installation included
          </p>
          <h1 className="font-headline text-2xl font-bold sm:text-3xl">
            Decal, Banner &amp; Signage Quote
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Upload your logo, set the size, pick a material. See it and the price live.
          </p>
        </div>

        {restored && (
          <div className="mb-4">
            <DraftNote onStartOver={startOver} />
          </div>
        )}

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          {/* ───────────── COL 1: items + job details ───────────── */}
          <div className="space-y-5">
            <Card n={1} title="Items in this job">
              <p className="mb-3 text-xs text-foreground-muted">
                Each logo or sign is its own item with its own size and material.
              </p>
              <ul className="space-y-2">
                {items.map((it, idx) => {
                  const ln = job.lines[idx];
                  const m = DECAL_MATERIALS.find((x) => x.key === it.material);
                  const on = it.id === sel.id;
                  return (
                    <li key={it.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(it.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(it.id);
                          }
                        }}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                          on
                            ? "border-accent bg-accent/10 ring-1 ring-accent"
                            : "border-border-soft bg-white/4 hover:bg-white/8"
                        }`}
                      >
                        <Thumb item={it} look={m?.look ?? "vinyl"} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {it.name.trim() || `Item ${idx + 1}`}
                          </div>
                          <div className="truncate text-[11px] text-foreground-muted">
                            {it.w && it.h
                              ? `${it.w} × ${it.h} ${unit}${it.qty > 1 ? ` · ×${it.qty}` : ""}`
                              : "Size not set"}{" "}
                            · {m?.label}
                          </div>
                        </div>
                        <div className="text-right">
                          {ln && ln.amount > 0 && !ln.problem ? (
                            <div className="font-mono text-sm font-bold text-cyan-300">
                              ${ln.amount.toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-[10px] text-foreground-muted">—</div>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove item ${idx + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(it.id);
                          }}
                          className="rounded-md px-1.5 py-1 text-sm text-rose-300 hover:bg-rose-500/10"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={addNewItem}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/50 bg-accent/5 px-4 py-3 text-sm font-bold text-accent transition hover:bg-accent/10"
              >
                + Add another logo / sign
              </button>
            </Card>

            <Card n={2} title="Job details (optional)">
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
                  Preferred install date
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

          {/* ───────────── COL 2: material, logo, size ───────────── */}
          <div className="space-y-5">
            <Card n={3} title={`Material · ${sel.name.trim() || `Item ${items.indexOf(sel) + 1}`}`}>
              <div className="grid grid-cols-2 gap-2">
                {DECAL_MATERIALS.map((m) => {
                  const on = sel.material === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => patch(sel.id, { material: m.key })}
                      className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition ${
                        on
                          ? "border-accent bg-accent/10 ring-1 ring-accent"
                          : "border-border-soft bg-white/4 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span
                        className="mb-1 block h-7 w-full rounded-md border border-black/10"
                        style={lookStyle(m.look)}
                        aria-hidden
                      />
                      <span className="text-[13px] font-bold leading-tight">{m.label}</span>
                      <span
                        className={`text-sm font-bold ${m.quoteOnly ? "text-rose-300" : "text-cyan-300"}`}
                      >
                        {m.quoteOnly ? "Custom pricing" : `$${m.pricePerSqFt.toFixed(2)}/sq ft`}
                      </span>
                      <span className="text-[11px] text-foreground-muted">{m.blurb}</span>
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
              {isAdmin && (
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
                    Only you see this, because you&apos;re signed in to admin on this
                    browser. Customers can&apos;t change prices.
                  </p>
                </div>
              )}
            </Card>

            <Card n={4} title="Upload your logo">
              <UploadBox
                slot={slot}
                onSelect={(f) => uploadDesign(f, setSlotFor(sel.id), { requirePreviewable: true })}
                onClear={() => {
                  setUploads((u) => ({ ...u, [sel.id]: EMPTY_UPLOAD_SLOT }));
                  patch(sel.id, { imageUrl: "", imageName: "", aspect: 0 });
                }}
                accept={ACCEPT_PREVIEWABLE_DESIGN_FILES}
                hint="PNG · JPG · SVG · PDF"
              />
              <p className="mt-2 text-[11px] text-foreground-muted">
                A transparent PNG looks best. No logo yet? Skip it and tell us in the note.
              </p>
            </Card>

            <Card n={5} title="Size & quantity">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-foreground-muted">
                  Type the size. The preview updates as you go.
                </span>
                <div className="inline-flex rounded-full border border-border-soft bg-background/60 p-0.5 text-xs font-semibold">
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
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
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
                  <span className="flex-1 text-center text-base font-bold tabular-nums">{sel.qty}</span>
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
                  onChange={(e) => patch(sel.id, { note: e.target.value.slice(0, 500) })}
                  rows={2}
                  placeholder="Anything we should know about this one…"
                  className="w-full resize-none rounded-xl border border-border-soft bg-white/4 px-4 py-2.5 text-sm placeholder:text-foreground-muted/60 outline-none ring-accent/40 focus:ring-2"
                  suppressHydrationWarning
                />
              </label>

              {/* Phones: the preview is far below, so show a small one here. */}
              <div className="mt-4 lg:hidden">
                <Stage
                  item={sel}
                  look={selMat.look}
                  wIn={inches(sel.w)}
                  hIn={inches(sel.h)}
                  unit={unit}
                  bg={stageBg}
                  compact
                />
              </div>
            </Card>
          </div>

          {/* ───────────── COL 3: preview + quote ───────────── */}
          <div className="space-y-5 lg:sticky lg:top-20">
            <section className="hidden rounded-2xl border border-border-soft bg-white/4 p-4 lg:block">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-headline text-sm font-bold uppercase tracking-wider">
                  Live preview
                </h2>
                <div className="inline-flex rounded-full border border-border-soft bg-background/60 p-0.5 text-[11px] font-semibold">
                  {(["light", "dark", "window"] as StageBg[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setStageBg(b)}
                      className={`rounded-full px-2.5 py-1 capitalize transition ${
                        stageBg === b ? "bg-accent text-black" : "text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <Stage
                item={sel}
                look={selMat.look}
                wIn={inches(sel.w)}
                hIn={inches(sel.h)}
                unit={unit}
                bg={stageBg}
              />

              {items.length > 1 && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    All items in this job
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {items.map((it, idx) => {
                      const m = DECAL_MATERIALS.find((x) => x.key === it.material);
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setSelectedId(it.id)}
                          className={`rounded-lg border p-1.5 text-center transition ${
                            it.id === sel.id
                              ? "border-accent bg-accent/10"
                              : "border-border-soft bg-white/4 hover:bg-white/8"
                          }`}
                        >
                          <div className="grid h-14 place-items-center">
                            <Thumb item={it} look={m?.look ?? "vinyl"} size={52} />
                          </div>
                          <div className="mt-1 truncate text-[10px] text-foreground-muted">
                            {it.w && it.h ? `${it.w}×${it.h}${unit}` : `Item ${idx + 1}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border-soft bg-white/4 p-4">
              <h2 className="mb-3 font-headline text-sm font-bold uppercase tracking-wider">
                Your quote
              </h2>

              <ul className="space-y-2">
                {items.map((it, idx) => {
                  const ln = job.lines[idx];
                  const m = DECAL_MATERIALS.find((x) => x.key === it.material);
                  return (
                    <li key={it.id} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">
                          {it.name.trim() || `Item ${idx + 1}`}
                        </span>
                        <span className="font-mono font-bold text-cyan-300">
                          {ln.callForQuote
                            ? "Call for quote"
                            : ln.problem
                              ? "—"
                              : `$${ln.amount.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-foreground-muted">
                        {m?.label}
                        {it.w && it.h ? ` · ${it.w}×${it.h} ${unit}` : ""}
                        {it.qty > 1 ? ` · ×${it.qty}` : ""}
                        {ln.rate > 0 && !ln.problem
                          ? ` · ${ln.totalAreaSqFt.toFixed(2)} sq ft @ $${ln.rate.toFixed(2)}`
                          : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 space-y-1.5 border-t border-border-soft pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Total area</span>
                  <span className="font-mono">{job.totalAreaSqFt.toFixed(2)} sq ft</span>
                </div>
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
                  <span className="font-mono font-black text-highlight">${job.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="mt-4 w-full rounded-md accent-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110"
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
                  role="status"
                  className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                >
                  {toast}
                </div>
              )}
            </section>

            {saved.length > 0 && (
              <section className="rounded-2xl border border-border-soft bg-white/4 p-4">
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
/* Preview pieces                                                      */
/* ------------------------------------------------------------------ */

/** Big preview: the sign at its real shape with the logo fitted inside. */
function Stage({
  item,
  look,
  wIn,
  hIn,
  unit,
  bg,
  compact,
}: {
  item: Item;
  look: MaterialLook;
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
  const dark = bg === "dark";
  const labelColor = dark ? "#d9f000" : "#0b5560";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border-soft ${compact ? "aspect-[4/3] max-h-64" : "aspect-[4/3]"}`}
      style={stageStyle(bg)}
    >
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm" style={{ color: dark ? "#9aa3ad" : "#4b5560" }}>
          Enter a width and height to see your sign
        </div>
      ) : (
        <>
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              width: `${pw * 100}%`,
              height: `${ph * 100}%`,
              transform: "translate(-50%,-50%)",
            }}
          >
            <div
              className="absolute inset-0 rounded-[3px] shadow-[0_8px_28px_rgba(0,0,0,.35)]"
              style={lookStyle(look)}
            >
              {look === "banner" && <Grommets />}
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt="Your logo on the sign"
                  className="absolute left-[7%] top-[7%] h-[86%] w-[86%] object-contain"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center px-3 text-center text-[11px] font-semibold" style={{ color: look === "tint" ? "#cbd5df" : "#6b7480" }}>
                  Upload your logo to see it here
                </div>
              )}
            </div>

            {/* width label */}
            <div className="pointer-events-none absolute -top-6 left-0 right-0 flex items-center justify-center gap-1 text-[11px] font-bold" style={{ color: labelColor }}>
              <span className="h-px flex-1" style={{ background: labelColor, opacity: 0.5 }} />
              <span className="font-mono">
                {fmtDim(wIn, unit)}
              </span>
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
              className="absolute bottom-2 left-2 flex flex-col items-center"
              title="US letter paper, same scale"
            >
              <div
                className="rounded-[2px] border border-black/25 bg-white/90"
                style={{ width: `${paperW * 100}%`, height: `${paperH * 100}%` }}
              />
            </div>
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
    ["4%", "6%"],
    ["50%", "6%"],
    ["96%", "6%"],
    ["4%", "94%"],
    ["50%", "94%"],
    ["96%", "94%"],
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

/** Small picture of an item: its true shape, material look and logo. */
function Thumb({
  item,
  look,
  size = 44,
}: {
  item: Item;
  look: MaterialLook;
  size?: number;
}) {
  const w = Number(item.w) || 0;
  const h = Number(item.h) || 0;
  const r = w > 0 && h > 0 ? w / h : 1;
  const tw = r >= 1 ? size : size * r;
  const th = r >= 1 ? size / r : size;
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <span
        className="relative block overflow-hidden rounded-[3px] border border-black/20"
        style={{ width: Math.max(14, tw), height: Math.max(14, th), ...lookStyle(look) }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="absolute inset-[8%] h-[84%] w-[84%] object-contain"
            draggable={false}
          />
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
  children,
}: {
  n?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-soft bg-white/4 p-4">
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
