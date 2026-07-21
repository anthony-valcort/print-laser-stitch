"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import {
  PART_LABELS,
  PART_ICONS,
  ALL_PARTS,
  type VehicleSticker,
  type PartKey,
} from "@/lib/vehicle-sticker-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getImages(v: VehicleSticker, part: PartKey): string[] {
  const info = v.parts[part];
  if (!info) return [];
  if (info.imageUrls?.length) return info.imageUrls;
  if (info.imageUrl) return [info.imageUrl];
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VehicleStickersClient({
  vehicles,
}: {
  vehicles: VehicleSticker[];
}) {
  const { addItem, itemCount, items } = useCart();

  // Filter state
  const [search, setSearch] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // Selected vehicle + year
  const [selected, setSelected] = useState<VehicleSticker | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // "just added" flash per part key
  const [justAdded, setJustAdded] = useState<PartKey | null>(null);

  // Detail modal
  const [detailPart, setDetailPart] = useState<PartKey | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const makes = useMemo(
    () => [...new Set(vehicles.map((v) => v.make))].sort(),
    [vehicles],
  );
  const models = useMemo(
    () =>
      [...new Set(vehicles.filter((v) => !make || v.make === make).map((v) => v.model))].sort(),
    [vehicles, make],
  );
  const years = useMemo(() => {
    const v = vehicles.find((v) => v.make === make && v.model === model);
    return v ? [...v.years].sort((a, b) => b - a) : [];
  }, [vehicles, make, model]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter((v) => {
      if (make && v.make !== make) return false;
      if (model && v.model !== model) return false;
      if (year && !v.years.includes(Number(year))) return false;
      if (q && !`${v.make} ${v.model}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vehicles, make, model, year, search]);

  // ── Filter handlers ────────────────────────────────────────────────────────
  const handleMakeChange = useCallback((m: string) => {
    setMake(m); setModel(""); setYear(""); setSelected(null);
  }, []);
  const handleModelChange = useCallback((m: string) => {
    setModel(m); setYear(""); setSelected(null);
  }, []);

  const selectVehicle = useCallback((v: VehicleSticker) => {
    setSelected(v);
    setSelectedYear(year ? Number(year) : v.years[v.years.length - 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [year]);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const isInCart = useCallback((part: PartKey): boolean => {
    if (!selected || !selectedYear) return false;
    return items.some(
      (item) =>
        item.kind === "vehicle-sticker" &&
        item.make === selected.make &&
        item.model === selected.model &&
        item.year === selectedYear &&
        item.part === part,
    );
  }, [items, selected, selectedYear]);

  const addToCart = useCallback((part: PartKey) => {
    if (!selected || !selectedYear || isInCart(part)) return;
    const info = selected.parts[part];
    if (!info) return;
    const imgs = getImages(selected, part);
    const label = `${selectedYear} ${selected.make} ${selected.model}`;
    addItem({
      kind: "vehicle-sticker",
      title: `Vehicle Sticker Kit — ${label}`,
      subtitle: PART_LABELS[part],
      thumbnail: imgs[0] ?? PART_ICONS[part],
      unitLabel: `$${info.price.toFixed(2)}`,
      totalPrice: info.price,
      quantity: 1,
      make: selected.make,
      model: selected.model,
      year: selectedYear,
      part,
      partLabel: PART_LABELS[part],
      editHref: "/vehicle-stickers",
    });
    setJustAdded(part);
    setTimeout(() => setJustAdded(null), 2000);
  }, [selected, selectedYear, isInCart, addItem]);

  // ── Detail modal helpers ───────────────────────────────────────────────────
  function openDetail(part: PartKey) {
    setDetailPart(part);
    setImgIdx(0);
  }
  function closeDetail() { setDetailPart(null); }
  function prevImg(total: number) { setImgIdx((i) => (i - 1 + total) % total); }
  function nextImg(total: number) { setImgIdx((i) => (i + 1) % total); }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 lg:px-8">
        <span className="inline-block rounded-full border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
          Vehicle-specific decal kits
        </span>
        <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Find Stickers for{" "}
          <span className="bg-linear-to-r from-[#18d3e8] to-[#d9f000] bg-clip-text text-transparent">
            Your Vehicle
          </span>
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Select your make, model and year — then pick a decal set.
        </p>
      </div>

      {/* Sticky filters */}
      <div className="sticky top-0 z-20 border-b border-border-soft bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search make or model…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border-soft bg-surface px-3 font-headline text-sm outline-none focus:border-[#18d3e8] focus:ring-1 focus:ring-[#18d3e8]"
            />
            <select value={make} onChange={(e) => handleMakeChange(e.target.value)}
              className="h-9 rounded-lg border border-border-soft bg-surface px-3 font-headline text-sm outline-none focus:border-[#18d3e8]">
              <option value="">All Makes</option>
              {makes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={model} onChange={(e) => handleModelChange(e.target.value)} disabled={!make}
              className="h-9 rounded-lg border border-border-soft bg-surface px-3 font-headline text-sm outline-none focus:border-[#18d3e8] disabled:opacity-40">
              <option value="">All Models</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => { setYear(e.target.value); setSelected(null); }} disabled={!model}
              className="h-9 rounded-lg border border-border-soft bg-surface px-3 font-headline text-sm outline-none focus:border-[#18d3e8] disabled:opacity-40">
              <option value="">All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {itemCount > 0 && (
              <Link href="/cart"
                className="relative ml-auto flex h-9 items-center gap-2 rounded-lg bg-[#d9f000] px-4 font-headline text-sm font-bold text-black transition hover:brightness-110">
                🛒 View Cart
                <span className="grid h-5 w-5 place-items-center rounded-full bg-black text-[10px] font-black text-[#d9f000]">
                  {itemCount}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Selected vehicle panel ──────────────────────────────────────── */}
        {selected && (
          <div className="mb-10 overflow-hidden rounded-2xl border border-[#18d3e8]/40 bg-surface shadow-[0_0_40px_rgba(24,211,232,0.08)]">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-border-soft px-6 py-4">
              <div>
                <div className="font-display text-2xl font-black uppercase">
                  {selected.make} {selected.model}
                </div>
                <div className="font-headline text-sm text-foreground-muted">
                  Choose a year, then click a set to view or add to cart
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#d94cb3] hover:text-[#d94cb3]">
                ✕ Close
              </button>
            </div>

            {/* Year picker */}
            <div className="border-b border-border-soft px-6 py-4">
              <div className="mb-2 font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">Year</div>
              <div className="flex flex-wrap gap-2">
                {[...selected.years].sort((a, b) => b - a).map((y) => (
                  <button key={y} onClick={() => setSelectedYear(y)}
                    className={`rounded-lg border px-3 py-1.5 font-headline text-sm font-semibold transition ${
                      selectedYear === y
                        ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]"
                        : "border-border-soft text-foreground-muted hover:border-[#18d3e8]/50"
                    }`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Part cards */}
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              {ALL_PARTS.map((part) => {
                const info = selected.parts[part];
                if (!info) return null;
                const imgs = getImages(selected, part);
                const inCart = isInCart(part);
                const justAddedThis = justAdded === part;

                return (
                  <div key={part}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-background/60 transition hover:border-[#18d3e8]/60 hover:shadow-[0_0_20px_rgba(24,211,232,0.1)]">

                    {/* Image — click to open detail */}
                    <button onClick={() => openDetail(part)} className="relative block w-full overflow-hidden focus:outline-none">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt={PART_LABELS[part]}
                          className="h-44 w-full object-cover transition group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-white/5 text-6xl transition group-hover:scale-105">
                          {PART_ICONS[part]}
                        </div>
                      )}
                      {imgs.length > 1 && (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 font-headline text-[10px] font-bold text-white">
                          1 / {imgs.length}
                        </span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-black/60 px-3 py-1.5 font-headline text-xs font-bold text-white backdrop-blur-sm">
                          View Details
                        </span>
                      </div>
                    </button>

                    {/* Info + actions */}
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <div className="font-headline text-sm font-bold">{PART_LABELS[part]}</div>
                        {info.skinName && (
                          <div className="text-xs text-foreground-muted">{info.skinName}</div>
                        )}
                        <div className="font-headline text-2xl font-black text-[#d9f000]">
                          ${info.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="mt-auto flex gap-2">
                        <button onClick={() => openDetail(part)}
                          className="flex-1 rounded-xl border border-border-soft py-2 font-headline text-xs font-semibold text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]">
                          Details
                        </button>
                        <button
                          onClick={() => addToCart(part)}
                          disabled={inCart || justAddedThis}
                          className={`flex-1 rounded-xl py-2 font-headline text-xs font-black uppercase tracking-wide transition ${
                            inCart
                              ? "cursor-default bg-[#18d3e8]/15 text-[#18d3e8]"
                              : justAddedThis
                              ? "bg-[#18d3e8] text-black"
                              : "bg-[#d9f000] text-black hover:brightness-110 active:scale-95"
                          }`}>
                          {inCart ? "✓ In Cart" : justAddedThis ? "✓ Added!" : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View cart bar (shown after any item added) */}
            {itemCount > 0 && (
              <div className="border-t border-border-soft bg-[#18d3e8]/5 px-6 py-3 flex items-center justify-between gap-4">
                <span className="font-headline text-sm text-[#18d3e8]">
                  {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
                </span>
                <Link href="/cart"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#d9f000] px-4 py-2 font-headline text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110">
                  View Cart →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Vehicle grid ────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-foreground-muted">
            No vehicles found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="mb-4 font-headline text-sm text-foreground-muted">
              {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} found
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((v) => {
                const isActive = selected?.id === v.id;
                const partCount = Object.keys(v.parts).length;
                return (
                  <button key={v.id} onClick={() => selectVehicle(v)}
                    className={`group flex flex-col gap-3 rounded-xl border p-5 text-left transition hover:-translate-y-0.5 ${
                      isActive
                        ? "border-[#18d3e8] bg-[#18d3e8]/10 shadow-[0_0_24px_rgba(24,211,232,0.2)]"
                        : "border-border-soft bg-surface hover:border-[#18d3e8]/50"
                    }`}>
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={`${v.make} ${v.model}`}
                        className="h-24 w-full rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-lg bg-white/5 text-5xl">🚗</div>
                    )}
                    <div>
                      <div className="font-display text-base font-black uppercase">{v.make}</div>
                      <div className="font-headline text-sm font-semibold text-foreground-muted">{v.model}</div>
                      <div className="mt-1 font-headline text-[11px] text-foreground-muted/70">
                        {v.years[0]}–{v.years[v.years.length - 1]}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ALL_PARTS.filter((p) => v.parts[p]).map((p) => (
                        <span key={p}
                          className="rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-2 py-0.5 font-headline text-[10px] text-[#d9f000]">
                          {PART_LABELS[p]}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto font-headline text-[11px] font-bold uppercase tracking-wider text-[#18d3e8]">
                      {partCount} set{partCount !== 1 ? "s" : ""} available →
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Part Detail Modal ──────────────────────────────────────────────── */}
      {detailPart && selected && (() => {
        const info = selected.parts[detailPart];
        if (!info) return null;
        const imgs = getImages(selected, detailPart);
        const inCart = isInCart(detailPart);
        const justAddedThis = justAdded === detailPart;

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeDetail} />
            <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border-soft bg-surface shadow-2xl sm:rounded-2xl"
              style={{ maxHeight: "90dvh" }}>

              {/* Image gallery — fixed height, never overflows */}
              <div className="relative shrink-0 bg-black">
                {imgs[imgIdx] ? (
                  <img src={imgs[imgIdx]} alt={PART_LABELS[detailPart]}
                    className="max-h-[45vh] w-full object-contain" />
                ) : (
                  <div className="flex h-48 items-center justify-center text-8xl">
                    {PART_ICONS[detailPart]}
                  </div>
                )}

                {/* Prev / Next */}
                {imgs.length > 1 && (
                  <>
                    <button onClick={() => prevImg(imgs.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-xl font-bold text-white backdrop-blur-sm transition hover:bg-black/80">
                      ‹
                    </button>
                    <button onClick={() => nextImg(imgs.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-xl font-bold text-white backdrop-blur-sm transition hover:bg-black/80">
                      ›
                    </button>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 font-headline text-xs text-white backdrop-blur-sm">
                      {imgIdx + 1} / {imgs.length}
                    </span>
                  </>
                )}

                {/* Close */}
                <button onClick={closeDetail}
                  className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80">
                  ✕
                </button>
              </div>

              {/* Scrollable area: thumbnails + info + buttons */}
              <div className="flex-1 overflow-y-auto">
                {/* Thumbnails */}
                {imgs.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto border-b border-border-soft bg-background/60 px-4 py-3">
                    {imgs.map((url, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                          i === imgIdx ? "border-[#18d3e8]" : "border-transparent opacity-50 hover:opacity-100"
                        }`}>
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="p-6">
                  <div className="font-headline text-xs font-bold uppercase tracking-widest text-foreground-muted">
                    {selected.make} {selected.model} · {selectedYear}
                  </div>
                  <div className="mt-1 font-display text-2xl font-black uppercase">
                    {PART_LABELS[detailPart]}
                  </div>
                  {info.skinName && (
                    <div className="mt-0.5 text-sm text-foreground-muted">{info.skinName}</div>
                  )}
                  <div className="mt-1 font-headline text-3xl font-black text-[#d9f000]">
                    ${info.price.toFixed(2)}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button onClick={closeDetail}
                      className="rounded-xl border border-border-soft px-5 py-3 font-headline text-sm text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]">
                      Back
                    </button>
                    <button
                      onClick={() => { addToCart(detailPart); }}
                      disabled={inCart}
                      className={`flex-1 rounded-xl py-3 font-headline text-sm font-black uppercase tracking-wider transition ${
                        inCart
                          ? "cursor-default bg-[#18d3e8]/15 text-[#18d3e8]"
                          : justAddedThis
                          ? "bg-[#18d3e8] text-black"
                          : "bg-[#d9f000] text-black hover:brightness-110 active:scale-[0.98]"
                      }`}>
                      {inCart ? "✓ Already in Cart" : justAddedThis ? "✓ Added to Cart!" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
