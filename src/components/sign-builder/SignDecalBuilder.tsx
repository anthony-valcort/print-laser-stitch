"use client";

/**
 * Sign & Decal Builder — the merged "Signage Quote" + "Decal Calculator".
 *
 *  1. Where is it going?  (window, door, wall, vehicle, sign)
 *  2. Size & shape        (live real-scale preview, drag + resize, presets)
 *  3. Material            (filtered to what works on that surface)
 *     …repeat for as many pieces as the job has
 *  4. Service             (print only / design & print / full install)
 *  5. Install details     (old-graphic removal + travel — install only)
 *
 * Prices come from src/lib/sign-decal-pricing.ts and are re-checked on the
 * server at checkout.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  MATERIALS,
  REMOVAL_MIN,
  REMOVAL_TYPES,
  SERVICES,
  SHAPES,
  SURFACES,
  TAX_RATE,
  TRAVEL_AREAS,
  TRAVEL_MIN,
  TRAVEL_RATE_PER_MILE,
  calcSignJob,
  fmtFtIn,
  getMaterial,
  getService,
  getSurface,
  getTravelArea,
  money,
  type MaterialKey,
  type RemovalInput,
  type ServiceKey,
  type ShapeKey,
  type SurfaceKey,
} from "@/lib/sign-decal-pricing";
import { useCart } from "@/lib/cart-store";
import type { SignJobCartItem } from "@/lib/cart-types";
import {
  ACCEPT_PREVIEWABLE_DESIGN_FILES,
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";
import { MultiImageUpload } from "@/components/configurator/MultiImageUpload";
import { DraftNote, useDraft } from "@/components/configurator/useDraft";
import Stage, { ShapeThumb, surfaceRect } from "./Stage";
import TravelMap from "./TravelMap";

type Unit = "in" | "ft";

type Piece = {
  id: string;
  surface: SurfaceKey;
  shape: ShapeKey;
  material: MaterialKey;
  widthIn: number;
  heightIn: number;
  qty: number;
  label: string;
  note: string;
  offsetX: number;
  offsetY: number;
};

type Snapshot = {
  pieces: Piece[];
  art: Record<string, { url: string; name: string }>;
  service: ServiceKey;
  removal: RemovalInput;
  travelArea: string;
  address: string;
  notes: string;
  unit: Unit;
  activeId: string;
};

const newId = () =>
  `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function makePiece(surface: SurfaceKey = "window", presetIndex = 0): Piece {
  const s = getSurface(surface)!;
  const preset = s.presets[presetIndex] ?? s.presets[0];
  return {
    id: newId(),
    surface,
    shape: preset.shape ?? "rect",
    material: s.defaultMaterial,
    widthIn: preset.w,
    heightIn: preset.h,
    qty: 1,
    label: "",
    note: "",
    offsetX: 0,
    offsetY: 0,
  };
}

const SIZE_REFS = [
  { n: "a business card", a: 3.5 * 2 },
  { n: "a sheet of paper", a: 8.5 * 11 },
  { n: "a pizza box", a: 16 * 16 },
  { n: "a doormat", a: 24 * 36 },
  { n: "a door", a: 36 * 80 },
  { n: "a queen mattress", a: 60 * 80 },
  { n: "a garage door", a: 96 * 84 },
  { n: "a parking space", a: 108 * 216 },
  { n: "the side of a bus", a: 480 * 120 },
];

function sizeRef(w: number, h: number) {
  const a = w * h;
  if (a <= 0) return null;
  let best = SIZE_REFS[0];
  for (const r of SIZE_REFS)
    if (Math.abs(Math.log(a / r.a)) < Math.abs(Math.log(a / best.a))) best = r;
  const ratio = a / best.a;
  const word = ratio > 1.35 ? "a bit bigger than" : ratio < 0.74 ? "a bit smaller than" : "about the size of";
  return `${word} ${best.n}`;
}

export default function SignDecalBuilder() {
  const router = useRouter();
  const { addItem } = useCart();

  const [pieces, setPieces] = useState<Piece[]>(() => [makePiece("window", 2)]);
  const [activeId, setActiveId] = useState<string>(() => pieces[0].id);
  const [uploads, setUploads] = useState<Record<string, UploadSlot>>({});
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [service, setService] = useState<ServiceKey>("full-install");
  const [removal, setRemoval] = useState<RemovalInput>({
    type: "none",
    sameAsNew: true,
    widthFt: 0,
    heightFt: 0,
  });
  const [travelArea, setTravelArea] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [unit, setUnit] = useState<Unit>("in");
  const [siteImages, setSiteImages] = useState<UploadSlot[]>([]);
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const active = pieces.find((p) => p.id === activeId) ?? pieces[0];
  const activeIndex = pieces.indexOf(active);
  const surface = getSurface(active.surface)!;
  const isInstall = service === "full-install";

  // ── draft (keeps the job if they wander off and come back) ──
  const art: Snapshot["art"] = {};
  for (const [k, s] of Object.entries(uploads))
    if (s.fileUrl) art[k] = { url: s.fileUrl, name: s.file?.name || "artwork" };
  const snapshot: Snapshot = {
    pieces,
    art,
    service,
    removal,
    travelArea,
    address,
    notes,
    unit,
    activeId,
  };
  const draft = useDraft<Snapshot>({
    handle: "sign-decal-builder",
    snapshot,
    hasContent: touched,
    restore: (saved) => {
      const restored = (saved.pieces ?? []).filter(
        (p) => getSurface(p.surface) && getMaterial(p.material) && typeof p.id === "string",
      );
      if (restored.length) {
        setPieces(restored);
        setActiveId(restored.some((p) => p.id === saved.activeId) ? saved.activeId! : restored[0].id);
      }
      if (saved.art) {
        const u: Record<string, UploadSlot> = {};
        for (const [k, v] of Object.entries(saved.art))
          if (v?.url) u[k] = { ...EMPTY_UPLOAD_SLOT, file: new File([], v.name || "artwork"), fileUrl: v.url };
        setUploads(u);
      }
      if (saved.service && getService(saved.service)) setService(saved.service);
      if (saved.removal) setRemoval({ ...removal, ...saved.removal });
      if (typeof saved.travelArea === "string") setTravelArea(saved.travelArea);
      if (typeof saved.address === "string") setAddress(saved.address);
      if (typeof saved.notes === "string") setNotes(saved.notes);
      if (saved.unit === "in" || saved.unit === "ft") setUnit(saved.unit);
      setTouched(true);
    },
  });

  // ── pricing ──
  const result = useMemo(
    () =>
      calcSignJob({
        pieces: pieces.map((p) => ({
          surface: p.surface,
          shape: p.shape,
          material: p.material,
          widthIn: p.widthIn,
          heightIn: p.heightIn,
          qty: p.qty,
        })),
        service,
        removal,
        travelArea,
      }),
    [pieces, service, removal, travelArea],
  );
  const activeResult = result.pieces[activeIndex];
  const travel = getTravelArea(travelArea);

  // ── edits ──
  function patchActive(patch: Partial<Piece>) {
    setTouched(true);
    setPieces((prev) => prev.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  }

  function chooseSurface(key: SurfaceKey) {
    const s = getSurface(key)!;
    const mat = getMaterial(active.material);
    const keepMat = mat && mat.surfaces.includes(key);
    const preset = s.presets[0];
    patchActive({
      surface: key,
      material: keepMat ? active.material : s.defaultMaterial,
      offsetX: 0,
      offsetY: 0,
      ...(active.widthIn > s.refW * 1.5 || active.heightIn > s.refH * 1.5
        ? { widthIn: preset.w, heightIn: preset.h }
        : {}),
    });
  }

  function addPiece() {
    if (pieces.length >= 30) return;
    const p = makePiece(active.surface, 0);
    setTouched(true);
    setPieces((prev) => [...prev, p]);
    setActiveId(p.id);
    document.getElementById("step-surface")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function duplicatePiece() {
    const p = { ...active, id: newId() };
    setTouched(true);
    setPieces((prev) => [...prev, p]);
    setActiveId(p.id);
  }

  function removePiece(id: string) {
    if (pieces.length <= 1) return;
    setTouched(true);
    const next = pieces.filter((p) => p.id !== id);
    setPieces(next);
    if (id === activeId) setActiveId(next[0].id);
  }

  function slotSetter(id: string): React.Dispatch<React.SetStateAction<UploadSlot>> {
    return (update) =>
      setUploads((prev) => {
        const cur = prev[id] ?? EMPTY_UPLOAD_SLOT;
        return { ...prev, [id]: typeof update === "function" ? update(cur) : update };
      });
  }

  function selectArtwork(f: File) {
    setTouched(true);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setLocalUrls((m) => ({ ...m, [active.id]: url }));
    }
    void uploadDesign(f, slotSetter(active.id), { requirePreviewable: true });
  }

  function clearArtwork() {
    setUploads((m) => {
      const n = { ...m };
      delete n[active.id];
      return n;
    });
    setLocalUrls((m) => {
      const n = { ...m };
      delete n[active.id];
      return n;
    });
  }

  const previewUrl = (id: string) => uploads[id]?.fileUrl ?? localUrls[id] ?? null;

  // ── cart ──
  function handleAddToCart() {
    if (result.blockers.length) {
      setToast(result.blockers[0]);
      return;
    }
    const uploading =
      Object.values(uploads).some((s) => s.isUploading) || siteImages.some((s) => s.isUploading);
    if (uploading) {
      setToast("Hang on — your files are still uploading.");
      return;
    }
    setToast(null);
    const svc = getService(service)!;
    const qtyTotal = pieces.reduce((s, p) => s + p.qty, 0);
    const item: Omit<SignJobCartItem, "id" | "addedAt"> = {
      kind: "sign-job",
      title: `Signs & Decals · ${svc.label}`,
      subtitle: `${pieces.length} ${pieces.length === 1 ? "piece" : "pieces"} · ${result.totalAreaSqFt.toFixed(2)} sq ft${
        isInstall && travel ? ` · ${travel.label.replace("Somewhere else · ", "")}` : ""
      }`,
      thumbnail: "🪧",
      unitLabel: `Includes ${(TAX_RATE * 100).toFixed(0)}% tax${result.removal ? " · removal" : ""}${result.travel ? " · travel" : ""}`,
      totalPrice: result.total,
      quantity: qtyTotal,
      pieces: pieces.map((p) => ({
        surface: p.surface,
        surfaceLabel: getSurface(p.surface)!.label,
        shape: p.shape,
        material: p.material,
        materialLabel: getMaterial(p.material)!.label,
        widthIn: p.widthIn,
        heightIn: p.heightIn,
        qty: p.qty,
        label: p.label.trim() || undefined,
        note: p.note.trim() || undefined,
        imageUrl: uploads[p.id]?.fileUrl ?? undefined,
      })),
      service,
      serviceLabel: svc.label,
      removal,
      travelArea: isInstall ? travelArea : "",
      travelLabel: isInstall ? travel?.label : undefined,
      installAddress: isInstall ? address.trim() || undefined : undefined,
      totalAreaSqFt: result.totalAreaSqFt,
      notes: notes.trim() || undefined,
      imageUrls: siteImages.map((s) => s.fileUrl).filter((u): u is string => Boolean(u)),
      editHref: "/signage-quotes",
    };
    addItem(item);
    draft.clear();
    router.push("/cart");
  }

  const materialsHere = MATERIALS.filter((m) => m.surfaces.includes(active.surface));
  const coverage =
    (active.widthIn * active.heightIn) / (surface.refW * surface.refH);
  const S = surfaceRect(active.surface);
  const oversized = active.widthIn > S.w + 0.5 || active.heightIn > S.h + 0.5;
  const ref = sizeRef(active.widthIn, active.heightIn);
  const canCheckout = result.blockers.length === 0;

  const freeAreas = TRAVEL_AREAS.filter((a) => a.free);
  const paidAreas = TRAVEL_AREAS.filter((a) => !a.free && a.lat != null);
  const bandAreas = TRAVEL_AREAS.filter((a) => a.lat == null);

  return (
    <section className="relative overflow-x-clip pb-28 lg:pb-0">
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-160 w-240 -translate-x-1/2 rounded-full bg-linear-to-r from-[#d9f000]/10 via-[#18d3e8]/10 to-[#d94cb3]/10 blur-3xl" />

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to home
        </Link>
        <div className="mt-5 animate-fade-up text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
            Signs · Window decals · Wall &amp; vehicle graphics
          </span>
          <h1 className="mt-4 font-display text-[2.2rem] font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Sign &amp; Decal{" "}
            <span className="bg-linear-to-r from-[#d9f000] via-[#18d3e8] to-[#d94cb3] bg-clip-text text-transparent">Builder</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-foreground-muted sm:text-base">
            Not sure what size to order? Pick where it goes and see it at real scale — next to a real-size person — before you buy.
          </p>
        </div>
        {draft.restored && (
          <div className="mx-auto mt-5 max-w-2xl">
            <DraftNote onStartOver={draft.startOver} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-3 pb-16 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="min-w-0 space-y-5">
            {/* Pieces tray */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {pieces.map((p, i) => {
                const on = p.id === active.id;
                const r = result.pieces[i];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                      on ? "border-[#d9f000]/60 bg-[#d9f000]/10" : "border-border-soft bg-white/3 hover:bg-white/6"
                    }`}
                  >
                    <ShapeThumb shape={p.shape} w={p.widthIn} h={p.heightIn} active={on} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">
                        {p.label.trim() ? p.label.trim().slice(0, 16) : `Piece ${i + 1}`}
                        {p.qty > 1 && <span className="text-foreground-muted"> ×{p.qty}</span>}
                      </span>
                      <span className="block text-[11px] text-foreground-muted">
                        {getSurface(p.surface)!.icon} {fmtFtIn(p.widthIn)} × {fmtFtIn(p.heightIn)}
                        {r?.problem ? <span className="text-amber-300"> · !</span> : r ? ` · ${money(r.price)}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={addPiece}
                className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-[#18d3e8]/50 px-3 py-3 text-xs font-bold text-[#18d3e8] transition hover:bg-[#18d3e8]/10"
              >
                <span className="text-base leading-none">+</span> Add another piece
              </button>
            </div>

            {/* Step 1 — surface */}
            <Card id="step-surface" n={1} color="#18d3e8" kicker={`Piece ${activeIndex + 1}`} title="Where is it going?">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {SURFACES.map((s) => {
                  const on = s.key === active.surface;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => chooseSurface(s.key)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition ${
                        on ? "border-[#18d3e8]/70 bg-[#18d3e8]/10 shadow-[0_0_30px_rgba(24,211,232,0.25)]" : "border-border-soft bg-background/40 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-xs font-bold leading-tight">{s.label}</span>
                      <span className="hidden text-[10px] leading-tight text-foreground-muted sm:block">{s.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Step 2 — size & shape with the live stage */}
            <Card n={2} color="#d9f000" kicker="Size & shape" title="Make it the right size">
              <div className="overflow-hidden rounded-2xl border border-border-soft bg-[#0e0e11]">
                <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">
                  <Stage
                    piece={{ ...active, imageUrl: previewUrl(active.id) }}
                    onChange={(patch) => patchActive(patch)}
                  />
                  <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur">
                    {surface.refLabel}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft px-3 py-2 text-[11px] text-foreground-muted">
                  <span>👆 Drag to move · pull the yellow dot to resize</span>
                  {ref && (
                    <span className="font-semibold text-foreground">
                      {fmtFtIn(active.widthIn)} × {fmtFtIn(active.heightIn)} — {ref}
                    </span>
                  )}
                </div>
              </div>

              {oversized && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  That&apos;s bigger than a typical {surface.label.toLowerCase()} — totally fine, we&apos;ll confirm exact measurements before we print.
                </p>
              )}

              {/* presets */}
              <div className="mt-4">
                <Label>Popular sizes for a {surface.label.toLowerCase()}</Label>
                <div className="flex flex-wrap gap-2">
                  {surface.presets.map((pr) => {
                    const on = pr.w === active.widthIn && pr.h === active.heightIn;
                    return (
                      <button
                        key={pr.label}
                        type="button"
                        onClick={() =>
                          patchActive({ widthIn: pr.w, heightIn: pr.h, offsetX: 0, offsetY: 0, ...(pr.shape ? { shape: pr.shape } : {}) })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          on ? "border-[#d9f000] bg-[#d9f000] text-black" : "border-border-soft bg-white/4 hover:bg-white/8"
                        }`}
                      >
                        {pr.label} <span className={on ? "text-black/60" : "text-foreground-muted"}>{fmtFtIn(pr.w)}×{fmtFtIn(pr.h)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* dimensions */}
              <div className="mt-4 flex items-end justify-between gap-3">
                <Label className="mb-0">Exact size</Label>
                <div className="inline-flex rounded-full border border-border-soft bg-background/60 p-1 text-xs font-semibold">
                  {(["in", "ft"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`rounded-full px-3.5 py-1 transition ${unit === u ? "bg-[#d9f000] text-black" : "text-foreground-muted hover:text-foreground"}`}
                    >
                      {u === "in" ? "Inches" : "Feet"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <DimInput label="Width" color="#d9f000" inches={active.widthIn} unit={unit} onChange={(v) => patchActive({ widthIn: v })} />
                <DimInput label="Height" color="#ff7ad9" inches={active.heightIn} unit={unit} onChange={(v) => patchActive({ heightIn: v })} />
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">How many</span>
                  <div className="flex items-center gap-1 rounded-2xl border border-border-soft bg-background/60 p-1">
                    <button type="button" aria-label="Fewer" onClick={() => patchActive({ qty: Math.max(1, active.qty - 1) })} className="grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-foreground-muted hover:bg-white/10">−</button>
                    <span className="min-w-10 flex-1 text-center text-lg font-black tabular-nums">{active.qty}</span>
                    <button type="button" aria-label="More" onClick={() => patchActive({ qty: Math.min(500, active.qty + 1) })} className="grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-foreground-muted hover:bg-white/10">+</button>
                  </div>
                </div>
              </div>

              {/* shape */}
              <div className="mt-4">
                <Label>Shape</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SHAPES.map((s) => {
                    const on = s.key === active.shape;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => patchActive({ shape: s.key })}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                          on ? "border-[#d9f000]/60 bg-[#d9f000]/10" : "border-border-soft bg-white/3 hover:bg-white/6"
                        }`}
                      >
                        <ShapeThumb shape={s.key} w={s.key === "rect" || s.key === "rounded" ? 3 : 2} h={2} active={on} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-foreground-muted">Every shape is priced by its outer width × height.</p>
              </div>

              {/* text + artwork */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>What does it say? (optional)</Label>
                  <textarea
                    value={active.label}
                    onChange={(e) => patchActive({ label: e.target.value.slice(0, 60) })}
                    rows={2}
                    placeholder={"e.g. OPEN 9–5\nor your business name"}
                    className="w-full resize-none rounded-xl border border-border-soft bg-background/60 px-3 py-2.5 text-sm outline-none ring-[#d9f000]/40 placeholder:text-foreground-muted/60 focus:ring-2"
                    suppressHydrationWarning
                  />
                  <p className="mt-1 text-[11px] text-foreground-muted">Shows on the preview so you can judge how readable it is.</p>
                </div>
                <div>
                  <Label>Your logo or artwork (optional)</Label>
                  <UploadBox
                    slot={uploads[active.id] ?? EMPTY_UPLOAD_SLOT}
                    onSelect={selectArtwork}
                    onClear={clearArtwork}
                    accept={ACCEPT_PREVIEWABLE_DESIGN_FILES}
                    hint="PNG · JPG · SVG · PDF — previews on your piece"
                  />
                </div>
              </div>
            </Card>

            {/* Step 3 — material */}
            <Card n={3} color="#d94cb3" kicker="Material" title={`What should piece ${activeIndex + 1} be made of?`}>
              <div className="grid gap-2 sm:grid-cols-2">
                {materialsHere.map((m) => {
                  const on = m.key === active.material;
                  const rate = m.rates[service];
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => patchActive({ material: m.key })}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                        on ? "border-[#d94cb3]/70 bg-[#d94cb3]/10" : "border-border-soft bg-background/40 hover:bg-white/5"
                      }`}
                    >
                      <Swatch look={m.look} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{m.label}</span>
                        <span className="block text-[11px] text-foreground-muted">{m.blurb}</span>
                      </span>
                      <span className="text-right text-xs font-black tabular-nums">
                        {m.quoteOnly ? (
                          <span className="text-rose-300">Quote</span>
                        ) : rate == null ? (
                          <span className="text-amber-300">Install only</span>
                        ) : (
                          <>
                            ${rate}
                            <span className="block text-[10px] font-medium text-foreground-muted">/ sq ft</span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {active.surface === "window" && active.material === "printed-vinyl" && coverage > 0.5 && (
                <p className="mt-3 rounded-xl border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-2 text-xs text-cyan-100">
                  💡 Covering most of the glass? <strong>Perforated Window Film</strong> lets you still see out from inside.
                </p>
              )}
              {getMaterial(active.material)?.quoteOnly && (
                <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  Specialty vinyl is priced per job. <Link href="/contact" className="font-bold underline">Send us the details</Link> or call{" "}
                  <a href="tel:7729852854" className="font-bold underline">(772) 985-2854</a>.
                </p>
              )}
              <div className="mt-4">
                <Label>Note about this piece (optional)</Label>
                <input
                  type="text"
                  value={active.note}
                  onChange={(e) => patchActive({ note: e.target.value.slice(0, 300) })}
                  placeholder="e.g. Left front window, white lettering"
                  className="w-full rounded-xl border border-border-soft bg-background/60 px-3 py-2.5 text-sm outline-none ring-[#d94cb3]/40 placeholder:text-foreground-muted/60 focus:ring-2"
                  suppressHydrationWarning
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={addPiece} className="rounded-md accent-gradient px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-wider text-black transition hover:brightness-110">
                  + Add another piece
                </button>
                <button type="button" onClick={duplicatePiece} className="rounded-md border border-border-soft px-4 py-2.5 text-xs font-semibold hover:bg-white/5">
                  Duplicate this piece
                </button>
                {pieces.length > 1 && (
                  <button type="button" onClick={() => removePiece(active.id)} className="rounded-md px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">
                    Delete piece {activeIndex + 1}
                  </button>
                )}
              </div>
            </Card>

            {/* Step 4 — service */}
            <Card n={4} color="#18d3e8" kicker="Whole job" title="How much help do you need?">
              <div className="grid gap-2 sm:grid-cols-3">
                {SERVICES.map((s) => {
                  const on = s.key === service;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        setTouched(true);
                        setService(s.key);
                      }}
                      className={`relative rounded-2xl border-2 p-4 text-left transition ${
                        on ? "border-[#d9f000]/70 bg-[#d9f000]/10 shadow-[0_0_30px_rgba(217,240,0,0.2)]" : "border-border-soft bg-background/40 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="mt-2 block text-sm font-bold">{s.label}</span>
                      <span className="mt-1 block text-[11px] text-foreground-muted">{s.blurb}</span>
                      {on && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#d9f000] text-[10px] font-black text-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Step 5 — install details */}
            {isInstall && (
              <Card n={5} color="#d9f000" kicker="Install details" title="Anything to remove first?">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REMOVAL_TYPES.map((r) => {
                    const on = r.key === removal.type;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => {
                          setTouched(true);
                          setRemoval((cur) => ({ ...cur, type: r.key }));
                        }}
                        className={`rounded-2xl border-2 p-3 text-left transition ${
                          on ? "border-[#d9f000]/70 bg-[#d9f000]/10" : "border-border-soft bg-background/40 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-xl">{r.icon}</span>
                        <span className="mt-1 block text-xs font-bold leading-tight">{r.label}</span>
                        <span className="mt-0.5 block text-[10px] text-foreground-muted">
                          {r.ratePerSqFt ? `$${r.ratePerSqFt}/sq ft` : r.blurb}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {removal.type !== "none" && (
                  <div className="mt-3 rounded-2xl border border-border-soft bg-background/40 p-3">
                    <Label>How big is what&apos;s there now?</Label>
                    <div className="flex flex-wrap gap-2">
                      <Chip on={removal.sameAsNew} onClick={() => setRemoval((c) => ({ ...c, sameAsNew: true }))}>
                        About the same as my new piece{pieces.length > 1 ? "s" : ""} ({result.totalAreaSqFt.toFixed(1)} sq ft)
                      </Chip>
                      <Chip on={!removal.sameAsNew} onClick={() => setRemoval((c) => ({ ...c, sameAsNew: false }))}>
                        Different size
                      </Chip>
                    </div>
                    {!removal.sameAsNew && (
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
                        <FtInput label="Width (ft)" value={removal.widthFt} onChange={(v) => setRemoval((c) => ({ ...c, widthFt: v }))} />
                        <FtInput label="Height (ft)" value={removal.heightFt} onChange={(v) => setRemoval((c) => ({ ...c, heightFt: v }))} />
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-foreground-muted">
                      Includes adhesive cleanup. Minimum removal charge {money(REMOVAL_MIN)}.
                    </p>
                  </div>
                )}

                <h3 className="mt-6 text-base font-bold">Where&apos;s the install?</h3>
                <p className="mt-1 text-xs text-foreground-muted">
                  <span className="font-bold text-[#d9f000]">No travel fee anywhere in Martin or St. Lucie County.</span>{" "}
                  Further out it&apos;s {money(TRAVEL_RATE_PER_MILE)} per mile from our Stuart shop (min {money(TRAVEL_MIN)}).
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-[170px_1fr]">
                  <div className="mx-auto h-72 w-36 overflow-hidden rounded-2xl border border-border-soft sm:h-[22rem] sm:w-full">
                    <TravelMap
                      selected={travel}
                      onSelect={(k) => {
                        setTouched(true);
                        setTravelArea(k);
                      }}
                    />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <AreaGroup title="Free — Martin & St. Lucie County" tone="free">
                      {freeAreas.map((a) => (
                        <Chip key={a.key} on={travelArea === a.key} tone="free" onClick={() => { setTouched(true); setTravelArea(a.key); }}>
                          {a.label}
                        </Chip>
                      ))}
                    </AreaGroup>
                    <AreaGroup title="Outside the free zone">
                      {paidAreas.map((a) => (
                        <Chip key={a.key} on={travelArea === a.key} onClick={() => { setTouched(true); setTravelArea(a.key); }}>
                          {a.label}
                          <span className="ml-1 opacity-60">
                            {a.miles > 150 ? "call" : money(Math.max(TRAVEL_MIN, a.miles * TRAVEL_RATE_PER_MILE))}
                          </span>
                        </Chip>
                      ))}
                    </AreaGroup>
                    <AreaGroup title="Not listed? Pick the distance from Stuart">
                      {bandAreas.map((a) => (
                        <Chip key={a.key} on={travelArea === a.key} onClick={() => { setTouched(true); setTravelArea(a.key); }}>
                          {a.label.replace("Somewhere else · ", "")}
                          <span className="ml-1 opacity-60">
                            {a.miles > 150 ? "call" : money(Math.max(TRAVEL_MIN, a.miles * TRAVEL_RATE_PER_MILE))}
                          </span>
                        </Chip>
                      ))}
                    </AreaGroup>
                    <div>
                      <Label>Install address (optional)</Label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => { setTouched(true); setAddress(e.target.value.slice(0, 300)); }}
                        placeholder="Street, city"
                        autoComplete="street-address"
                        className="w-full rounded-xl border border-border-soft bg-background/60 px-3 py-2.5 text-sm outline-none ring-[#d9f000]/40 placeholder:text-foreground-muted/60 focus:ring-2"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Notes + photos */}
            <Card n={isInstall ? 6 : 5} color="#d94cb3" kicker="Optional" title="Anything else we should know?">
              <textarea
                value={notes}
                onChange={(e) => { setTouched(true); setNotes(e.target.value.slice(0, 2000)); }}
                rows={3}
                placeholder="Deadline, colors, best time to install…"
                className="w-full resize-none rounded-2xl border border-border-soft bg-background/60 px-4 py-3 text-sm outline-none ring-[#d94cb3]/40 placeholder:text-foreground-muted/60 focus:ring-2"
                suppressHydrationWarning
              />
              <div className="mt-4">
                <Label>Photos of the spot (optional)</Label>
                <MultiImageUpload images={siteImages} onImagesChange={setSiteImages} />
                <p className="mt-2 text-[11px] text-foreground-muted">A quick phone photo of the window, wall or vehicle helps us prep faster.</p>
              </div>
            </Card>
          </div>

          {/* Summary */}
          <aside id="quote-summary" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <div className="relative overflow-hidden rounded-3xl border border-[#d9f000]/30 bg-linear-to-br from-background to-surface-elevated p-5 shadow-[0_0_40px_rgba(217,240,0,0.12)] sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-linear-to-br from-[#d9f000] to-[#18d3e8] opacity-20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Your quote</span>
                  <span className="rounded-full bg-[#d9f000] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                    {getService(service)!.label}
                  </span>
                </div>
                <div className="mt-4 text-5xl font-black tabular-nums tracking-tight">{money(result.total)}</div>
                <div className="mt-1 text-[11px] text-foreground-muted">
                  {result.totalAreaSqFt.toFixed(2)} sq ft · {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} · tax included
                </div>

                <div className="mt-5 space-y-2 rounded-2xl bg-background/50 p-4 text-xs">
                  {pieces.map((p, i) => {
                    const r = result.pieces[i];
                    return (
                      <button key={p.id} type="button" onClick={() => setActiveId(p.id)} className="flex w-full items-start justify-between gap-3 text-left">
                        <span className="min-w-0 text-foreground-muted">
                          <span className="font-semibold text-foreground">{p.label.trim() ? p.label.trim().slice(0, 18) : `Piece ${i + 1}`}</span>{" "}
                          {fmtFtIn(p.widthIn)}×{fmtFtIn(p.heightIn)}
                          {p.qty > 1 ? ` ×${p.qty}` : ""} · {getMaterial(p.material)!.label}
                          {r.problem && <span className="block text-amber-300">{r.problem}</span>}
                        </span>
                        <span className="shrink-0 font-mono font-semibold">{r.problem ? "—" : money(r.price)}</span>
                      </button>
                    );
                  })}
                  <div className="my-2 border-t border-border-soft" />
                  <Row label="Graphics" value={money(result.graphics)} />
                  <Row label={`Tax (${(TAX_RATE * 100).toFixed(0)}% Martin County)`} value={money(result.tax)} />
                  {isInstall && removal.type !== "none" && (
                    <Row label={`Removal · ${result.removalAreaSqFt.toFixed(1)} sq ft`} value={result.removal ? money(result.removal) : "—"} />
                  )}
                  {isInstall && (
                    <Row
                      label={travel ? `Travel · ${travel.label.replace("Somewhere else · ", "")}` : "Travel"}
                      value={!travel ? "choose area" : travel.free ? "FREE" : travel.miles > 150 ? "call us" : money(result.travel)}
                      accent={!!travel?.free}
                    />
                  )}
                  <div className="my-2 border-t border-border-soft" />
                  <div className="flex items-center justify-between text-base">
                    <span className="font-black">Total</span>
                    <span className="font-mono font-black text-[#d9f000]">{money(result.total)}</span>
                  </div>
                </div>

                {!canCheckout && (
                  <ul className="mt-3 space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                    {result.blockers.slice(0, 4).map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canCheckout}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md accent-gradient px-5 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-xl shadow-[#d9f000]/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add to Cart · {money(result.total)}
                </button>
                {toast && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{toast}</div>}
                <p className="mt-3 text-center text-[11px] text-foreground-muted">
                  Big or tricky job? Call <a href="tel:7729852854" className="font-semibold text-foreground underline">(772) 985-2854</a>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile price bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={() => document.getElementById("quote-summary")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} · see breakdown ↑
            </span>
            <span className="block text-2xl font-black tabular-nums">{money(result.total)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (canCheckout) handleAddToCart();
              else document.getElementById("quote-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`rounded-md px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black ${canCheckout ? "accent-gradient" : "bg-white/30"}`}
          >
            {canCheckout ? "Add to Cart" : "Finish quote"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── small UI bits ────────────────────────────────────────────────────────

function Card({
  id,
  n,
  color,
  kicker,
  title,
  children,
}: {
  id?: string;
  n: number;
  color: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-border-soft bg-linear-to-br from-surface to-surface-elevated p-4 sm:p-7">
      <div className="mb-4">
        <div className="flex items-center gap-2 font-headline text-xs font-semibold uppercase tracking-[0.2em]" style={{ color }}>
          <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${color}26` }}>
            {n}
          </span>
          {kicker}
        </div>
        <h2 className="mt-2 text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted ${className}`}>{children}</span>;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-foreground-muted">{label}</span>
      <span className={`shrink-0 font-mono font-semibold ${accent ? "text-[#d9f000]" : ""}`}>{value}</span>
    </div>
  );
}

function Chip({
  on,
  onClick,
  tone,
  children,
}: {
  on: boolean;
  onClick: () => void;
  tone?: "free";
  children: React.ReactNode;
}) {
  const onCls = tone === "free" ? "border-[#d9f000] bg-[#d9f000] text-black" : "border-[#18d3e8] bg-[#18d3e8] text-black";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? onCls : "border-border-soft bg-white/4 hover:bg-white/8"}`}
    >
      {children}
    </button>
  );
}

function AreaGroup({ title, tone, children }: { title: string; tone?: "free"; children: React.ReactNode }) {
  return (
    <div>
      <span className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wider ${tone === "free" ? "text-[#d9f000]" : "text-foreground-muted"}`}>{title}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Swatch({ look }: { look: string }) {
  const bg =
    look === "tint"
      ? "linear-gradient(135deg,#0b1220,#1e293b)"
      : look === "solid"
        ? "#f4f4f5"
        : look === "special"
          ? "linear-gradient(135deg,#9ca3af,#f5f5f5 40%,#a1a1aa 65%,#e4e4e7)"
          : "linear-gradient(135deg,#18d3e8,#7be3a0 55%,#d9f000)";
  return (
    <span
      className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-white/15"
      style={{
        background: bg,
        backgroundImage:
          look === "perf"
            ? "radial-gradient(rgba(0,0,0,.55) 30%, transparent 32%), linear-gradient(135deg,#18d3e8,#7be3a0 55%,#d9f000)"
            : undefined,
        backgroundSize: look === "perf" ? "5px 5px, 100% 100%" : undefined,
      }}
    />
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Number box that shows inches or feet but always reports inches. */
function DimInput({
  label,
  color,
  inches,
  unit,
  onChange,
}: {
  label: string;
  color: string;
  inches: number;
  unit: Unit;
  onChange: (inches: number) => void;
}) {
  const fmt = (v: number) => (v > 0 ? String(unit === "in" ? round2(v) : round2(v / 12)) : "");
  const [text, setText] = useState(fmt(inches));
  const [prev, setPrev] = useState({ inches, unit });
  if (prev.inches !== inches || prev.unit !== unit) {
    const typed = Number(text);
    const typedIn = unit === "in" ? typed : typed * 12;
    setPrev({ inches, unit });
    if (prev.unit !== unit || !Number.isFinite(typed) || Math.abs(typedIn - inches) > 0.01) setText(fmt(inches));
  }
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={unit === "in" ? 0.5 : 0.25}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0) onChange(Math.min(600, unit === "in" ? n : n * 12));
          }}
          placeholder="0"
          className="w-full rounded-2xl border border-border-soft bg-background/60 px-4 py-3 pr-12 text-2xl font-black tabular-nums outline-none ring-[#d9f000]/40 transition focus:ring-2"
          suppressHydrationWarning
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/5 px-2 py-1 text-xs font-bold uppercase text-foreground-muted">
          {unit}
        </span>
      </div>
    </label>
  );
}

function FtInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        placeholder="0"
        className="w-full rounded-xl border border-border-soft bg-background/60 px-3 py-2.5 text-sm outline-none ring-[#d9f000]/40 focus:ring-2"
        suppressHydrationWarning
      />
    </label>
  );
}
