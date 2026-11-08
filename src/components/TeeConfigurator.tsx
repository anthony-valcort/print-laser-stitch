/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShopifyProduct } from "@/lib/shopify-products";
import { TSHIRT_MIN_QUANTITY, type PrintLocationKey } from "@/lib/tshirt-pricing";
import { nextVolumeTier, volumeDiscountPercent, volumeTiersFor } from "@/lib/volume-discounts";
import { useCart } from "@/lib/cart-store";
import type { ProductCartItem, TShirtCartItem, TShirtSizeLine } from "@/lib/cart-types";
import { colorHex, isColorOption, isSizeOption } from "@/components/configurator/colors";
import { ColorSwatch } from "@/components/configurator/ColorSwatch";
import { BulkPricingLadder, BulkProgress } from "@/components/configurator/BulkPricing";
import MixMatchPanel from "@/components/configurator/MixMatchPanel";
import { SizeQtyStepper } from "@/components/configurator/QuantityStepper";
import { canAddToMix, mixStatus, type MixLine } from "@/lib/apparel-mix";
import { flyToCart, successFeedback } from "@/lib/interactions";
import { openCartDrawer } from "@/lib/cart-drawer";
import { DraftNote, useDraft } from "@/components/configurator/useDraft";
import TeeDesigner, {
  renderMockup,
  uploadBlob,
  zoneFor,
  quality,
  tintPhoto,
  type DesignerLogos,
  type Logo,
  type PhotoKey,
  type Side,
} from "@/components/configurator/TeeDesigner";

const STYLES = [
  { name: "Cotton Short Sleeve", label: "Cotton tee", sub: "Short sleeve", long: false },
  { name: "Cotton Long Sleeve", label: "Cotton tee", sub: "Long sleeve", long: true },
  { name: "Polyester Short Sleeve", label: "Performance tee", sub: "Short sleeve", long: false },
  { name: "Polyester Long Sleeve", label: "Performance tee", sub: "Long sleeve", long: true },
] as const;
const ONE_SIZES = ["S", "M", "L", "XL", "2XL"];
const RUSH_LABEL = "Rush - 2 business days";
const STD_LABEL = "Standard";
const DRAFT_KEY = "tees-v2";
const MIN = TSHIRT_MIN_QUANTITY;

type Mode = "one" | "bulk";

const h2 = "mb-2 font-headline text-xs uppercase tracking-widest text-[#18d3e8]";
const chip = (on: boolean) =>
  "rounded-xl border px-3 py-2.5 text-sm font-bold transition " +
  (on ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]" : "border-white/15 bg-surface text-white/80");
const card = (on: boolean) =>
  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition " +
  (on ? "border-[#18d3e8] bg-[#18d3e8]/10" : "border-white/15 bg-surface");
const dot = (on: boolean, sq = false) =>
  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 text-[10px] leading-none " +
  (sq ? "rounded " : "rounded-full ") +
  (on ? "border-[#18d3e8] bg-[#18d3e8] text-black" : "border-white/40");
const field = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base text-white placeholder:text-white/40";

function optVal(v: { selectedOptions: Array<{ name: string; value: string }> }, name: string) {
  return v.selectedOptions.find((o) => o.name.toLowerCase() === name.toLowerCase())?.value;
}

function packLogo(l?: Logo) {
  if (!l || !l.fileUrl || l.uploading) return null;
  return { u: l.fileUrl, n: l.name, r: l.ratio, p: l.pxW, v: l.vector, x: l.nx, y: l.ny, w: l.wIn };
}
function unpackLogo(raw: unknown): Logo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && v >= lo && v <= hi ? v : null);
  const r = num(o.r, 0.01, 100);
  const p = num(o.p, 1, 100000);
  const x = num(o.x, 0, 1);
  const y = num(o.y, 0, 1);
  const w = num(o.w, 0.25, 20);
  if (typeof o.u !== "string" || !o.u.startsWith("https://") || r == null || p == null || x == null || y == null || w == null) return undefined;
  return { url: o.u, fileUrl: o.u, name: typeof o.n === "string" ? o.n.slice(0, 120) : "design", ratio: r, pxW: p, vector: o.v === true, nx: x, ny: y, wIn: w };
}

export default function TeeConfigurator({
  bulk,
  single,
}: {
  bulk: ShopifyProduct;
  single: ShopifyProduct | null;
}) {
  const router = useRouter();
  const { addItem, items: cartItems } = useCart();
  const hasOne = !!single;

  const [mode, setMode] = useState<Mode>(hasOne ? "one" : "bulk");
  const [style, setStyle] = useState<(typeof STYLES)[number]["name"]>("Cotton Short Sleeve");
  const [chest, setChest] = useState(false);
  const [logos, setLogosState] = useState<DesignerLogos>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  // one-shirt
  const [size, setSize] = useState("L");
  const [rush, setRush] = useState(false);
  const [proof, setProof] = useState(true);
  // bulk
  const sizeOption = bulk.options.find((o) => isSizeOption(o.name));
  const colorOption = bulk.options.find((o) => isColorOption(o.name));
  const colorChoices = colorOption?.values ?? [];
  const [openColors, setOpenColors] = useState<string[]>([]);
  const [colorSizeQty, setColorSizeQty] = useState<Record<string, Record<string, number>>>({});
  const artRef = useRef<HTMLDivElement>(null);

  const setLogos = (fn: (cur: DesignerLogos) => DesignerLogos) => setLogosState(fn);

  const styleInfo = STYLES.find((s) => s.name === style) ?? STYLES[0];
  const photoKey: PhotoKey = styleInfo.long ? "tee-long" : "tee-short";

  // ---------- prices ----------
  const oneVariant = (sz: string, speed: string) =>
    single?.variants.find(
      (v) => optVal(v, "Style") === style && optVal(v, "Size") === sz && optVal(v, "Speed") === speed,
    );
  const onePrice = (sz: string, speed: string) => Number(oneVariant(sz, speed)?.price ?? 0);

  const bulkVariant = (color: string, sz: string) =>
    bulk.variants.find(
      (v) => optVal(v, "Sleeve Type") === style && optVal(v, "Color") === color && optVal(v, "Size") === sz,
    );
  const bulkBase = (() => {
    const prices = bulk.variants.filter((v) => optVal(v, "Sleeve Type") === style).map((v) => Number(v.price));
    return prices.length ? Math.min(...prices) : 0;
  })();

  const volumeTiers = volumeTiersFor(bulk.title);
  const maxPct = volumeTiers.length ? Math.max(...volumeTiers.map((t) => t.percent)) : 0;

  const colorLines = useMemo(() => {
    const lines: Array<{ color: string; size: string; qty: number; price: number; variantId: string }> = [];
    for (const [color, sizes] of Object.entries(colorSizeQty)) {
      for (const [sz, qty] of Object.entries(sizes)) {
        if (qty <= 0) continue;
        const v = bulk.variants.find(
          (x) => optVal(x, "Sleeve Type") === style && optVal(x, "Color") === color && optVal(x, "Size") === sz,
        );
        if (v) lines.push({ color, size: sz, qty, price: Number(v.price), variantId: v.id });
      }
    }
    return lines;
  }, [colorSizeQty, style, bulk.variants]);
  const totalQuantity = colorLines.reduce((a, l) => a + l.qty, 0);
  const totalPrice = colorLines.reduce((a, l) => a + l.price * l.qty, 0);
  const volumePct = volumeDiscountPercent(bulk.title, totalQuantity);
  const volumeSavings = Math.round(totalPrice * volumePct) / 100;
  const finalPrice = Math.round((totalPrice - volumeSavings) * 100) / 100;
  const upcomingTier = nextVolumeTier(bulk.title, totalQuantity);

  const cartGarmentLines: MixLine[] = useMemo(
    () =>
      cartItems
        .filter((i) => i.kind === "tshirt")
        .map((i) => ({
          productTitle: i.productTitle,
          quantity: i.sizeVariants.reduce((a, sv) => a + Math.max(0, Math.floor(Number(sv.quantity) || 0)), 0),
        })),
    [cartItems],
  );
  const mix = useMemo(
    () => mixStatus([...cartGarmentLines, { productTitle: bulk.title, quantity: totalQuantity }]),
    [cartGarmentLines, bulk.title, totalQuantity],
  );
  const mixGate = canAddToMix({
    thisStyleQty: totalQuantity,
    productTitle: bulk.title,
    ownMinimum: MIN,
    otherLines: cartGarmentLines,
  });

  const oneTotal = onePrice(size, rush ? RUSH_LABEL : STD_LABEL);
  const total = mode === "one" ? oneTotal : finalPrice;

  // ---------- designer ----------
  const previewColor =
    mode === "one"
      ? null
      : (() => {
          const c = openColors[0];
          if (!c || /^black$/i.test(c)) return null;
          return colorHex(c) ?? null;
        })();
  const hasArt = !!(logos.front || logos.back);
  const uploading = !!(logos.front?.uploading || logos.back?.uploading);
  const upError = logos.front?.error || logos.back?.error;

  // ---------- add colors ----------
  const addColor = (c: string) => {
    setOpenColors((p) => (p.includes(c) ? p : [...p, c]));
    setColorSizeQty((p) =>
      p[c] ? p : { ...p, [c]: Object.fromEntries((sizeOption?.values ?? []).map((s) => [s, 0])) },
    );
  };
  const removeColor = (c: string) => {
    setOpenColors((p) => p.filter((x) => x !== c));
    setColorSizeQty((p) => {
      const n = { ...p };
      delete n[c];
      return n;
    });
  };
  const setCS = (c: string, s: string, n: number) =>
    setColorSizeQty((p) => ({ ...p, [c]: { ...(p[c] ?? {}), [s]: Math.max(0, n) } }));

  // ---------- 30-day draft ----------
  const draft = useDraft({
    handle: DRAFT_KEY,
    snapshot: {
      m: mode,
      st: style,
      ch: chest,
      sz: size,
      ru: rush,
      pr: proof,
      n: notes,
      oc: openColors,
      cs: colorSizeQty,
      lf: packLogo(logos.front),
      lb: packLogo(logos.back),
    },
    hasContent:
      !!packLogo(logos.front) ||
      !!packLogo(logos.back) ||
      !!notes.trim() ||
      Object.values(colorSizeQty).some((r) => Object.values(r).some((n) => n > 0)),
    restore: (d) => {
      if (d.m === "bulk" || (d.m === "one" && hasOne)) setMode(d.m);
      if (STYLES.some((s) => s.name === d.st)) setStyle(d.st as (typeof STYLES)[number]["name"]);
      if (typeof d.ch === "boolean") setChest(d.ch);
      if (typeof d.sz === "string" && ONE_SIZES.includes(d.sz)) setSize(d.sz);
      if (typeof d.ru === "boolean") setRush(d.ru);
      if (typeof d.pr === "boolean") setProof(d.pr);
      if (typeof d.n === "string") setNotes(d.n.slice(0, 2000));
      const sizes = sizeOption?.values ?? [];
      const oc = Array.isArray(d.oc) ? (d.oc as unknown[]).filter((c): c is string => typeof c === "string" && colorChoices.includes(c)) : [];
      setOpenColors(oc);
      const cs: Record<string, Record<string, number>> = {};
      const raw = (d.cs ?? {}) as Record<string, Record<string, unknown>>;
      for (const c of oc) {
        cs[c] = {};
        for (const s of sizes) {
          const n = Number(raw[c]?.[s]);
          cs[c][s] = Number.isFinite(n) ? Math.min(9999, Math.max(0, Math.floor(n))) : 0;
        }
      }
      setColorSizeQty(cs);
      const lf = unpackLogo(d.lf);
      const lb = unpackLogo(d.lb);
      setLogosState({ ...(lf ? { front: lf } : {}), ...(lb ? { back: lb } : {}) });
    },
  });

  // ---------- add to cart ----------
  const needArt = !hasArt;
  const bulkQtyOk = mixGate.ok;
  const disabled = !!busy || uploading || !!upError;

  async function makeMockups(): Promise<Partial<Record<Side, string>>> {
    const out: Partial<Record<Side, string>> = {};
    for (const s of ["front", "back"] as Side[]) {
      const l = logos[s];
      if (!l) continue;
      try {
        const base = `/one-shirt/${photoKey}-${s}.jpg`;
        let photo = base;
        if (previewColor) {
          photo = await tintPhoto(base, previewColor);
        }
        const blob = await renderMockup(photo, s, photoKey, zoneFor(photoKey, s, chest), l);
        out[s] = await uploadBlob(blob, `${s}-mockup.jpg`);
      } catch {
        /* the original file is still attached; the mockup is a nice-to-have */
      }
    }
    return out;
  }

  function placementText(): string[] {
    const lines: string[] = [];
    for (const s of ["front", "back"] as Side[]) {
      const l = logos[s];
      if (!l) continue;
      const z = zoneFor(photoKey, s, chest);
      const q = quality(l);
      lines.push(
        `${s === "front" ? "Front" : "Back"}: ${z.label}, ${l.wIn.toFixed(1)}x${(l.wIn * l.ratio).toFixed(1)} in, ` +
          (q.level === "vector" ? "vector" : `${q.dpi} DPI (${q.level})`),
      );
    }
    return lines;
  }

  async function add(goCart: boolean) {
    setErr("");
    if (needArt) {
      setErr("Upload a design for the front or back first.");
      artRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (mode === "bulk" && !bulkQtyOk) {
      setErr(totalQuantity === 0 ? "Pick colors, sizes and quantities first." : mixGate.reason ?? `Add ${MIN - totalQuantity} more to reach ${MIN}.`);
      return;
    }
    try {
      setBusy("Saving…");
      const mocks = await makeMockups();
      const place = placementText();
      if (mode === "one" && single) {
        const v = oneVariant(size, rush ? RUSH_LABEL : STD_LABEL);
        if (!v) throw new Error("That option is not available.");
        const props: Record<string, string> = {};
        if (logos.front?.fileUrl) props["Front design"] = logos.front.fileUrl;
        if (mocks.front) props["Front mockup"] = mocks.front;
        if (logos.back?.fileUrl) props["Back design"] = logos.back.fileUrl;
        if (mocks.back) props["Back mockup"] = mocks.back;
        if (place.length) props["Print placement"] = place.join(" | ");
        props["Shirt color"] = "Black";
        props["Proof"] = proof ? "Send me a proof first" : "No proof - print exactly as shown";
        if (notes.trim()) props["Notes"] = notes.trim();
        const unit = Number(v.price);
        const item: Omit<ProductCartItem, "id" | "addedAt"> = {
          kind: "product",
          title: "Custom T-Shirt (1 shirt)",
          subtitle: `${style} · Black · ${size}${rush ? " · Rush" : ""}`,
          thumbnail: mocks.front ?? mocks.back ?? `/one-shirt/${photoKey}-front.jpg`,
          unitLabel: `$${unit.toFixed(2)} each`,
          totalPrice: unit,
          quantity: 1,
          variantId: v.id,
          productTitle: single.title,
          selectedOptions: { Style: style, Size: size, Speed: rush ? RUSH_LABEL : STD_LABEL },
          qty: 1,
          unitPrice: unit,
          extraProperties: props,
          editHref: "/products/tshirts?mode=one",
        };
        addItem(item);
      } else {
        const sizeVariants: TShirtSizeLine[] = colorLines.map((l) => ({
          variantId: l.variantId,
          size: l.size,
          quantity: l.qty,
          unitPrice: l.price,
          color: l.color,
        }));
        const byColor = new Map<string, string[]>();
        for (const sv of sizeVariants) {
          const a = byColor.get(sv.color!) ?? [];
          a.push(`${sv.quantity}${sv.size}`);
          byColor.set(sv.color!, a);
        }
        const colorsN = byColor.size;
        const loc: PrintLocationKey = logos.front && logos.back ? "both" : logos.back ? "back" : "front";
        const extra = [
          ...place,
          mocks.front ? `Front mockup: ${mocks.front}` : "",
          mocks.back ? `Back mockup: ${mocks.back}` : "",
          proof ? "Proof: send me a proof first" : "Proof: print exactly as shown",
        ].filter(Boolean);
        const item: Omit<TShirtCartItem, "id" | "addedAt"> = {
          kind: "tshirt",
          title: bulk.title,
          subtitle:
            `${style} · ` +
            Array.from(byColor.entries()).map(([c, p]) => `${c} ${p.join("/")}`).join(" · "),
          thumbnail: mocks.front ?? mocks.back ?? bulk.featuredImage?.url ?? "👕",
          unitLabel: `${totalQuantity} pcs · ${colorsN} ${colorsN === 1 ? "color" : "colors"}`,
          totalPrice: finalPrice,
          quantity: totalQuantity,
          productTitle: bulk.title,
          selectedOptions: { "Sleeve Type": style },
          printLocation: loc,
          sizeVariants,
          frontFileUrl: logos.front?.fileUrl,
          frontFileName: logos.front?.name,
          backFileUrl: logos.back?.fileUrl,
          backFileName: logos.back?.name,
          instructions: [notes.trim(), ...extra].filter(Boolean).join("\n") || undefined,
          editHref: "/products/tshirts",
        };
        addItem(item);
      }
      draft.clear();
      successFeedback();
      if (goCart) {
        router.push("/cart");
      } else {
        flyToCart(artRef.current);
        setTimeout(openCartDrawer, 650);
        setBusy("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy("");
    }
  }

  // jump to bulk/one from the URL (?mode=one)
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "one" && hasOne) setMode("one");
    if (m === "bulk") setMode("bulk");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stylePrice = (s: (typeof STYLES)[number]) =>
    mode === "one"
      ? Number(single?.variants.find((v) => optVal(v, "Style") === s.name && optVal(v, "Size") === "L" && optVal(v, "Speed") === STD_LABEL)?.price ?? 0)
      : Math.min(...bulk.variants.filter((v) => optVal(v, "Sleeve Type") === s.name).map((v) => Number(v.price)));

  const buttons = (cls: string) => (
    <div className={"flex gap-2 " + cls}>
      <button type="button" disabled={disabled} onClick={() => void add(false)}
        className="min-h-12 flex-1 rounded-xl border border-[#18d3e8] px-3 py-3 text-sm font-black uppercase text-[#18d3e8] disabled:opacity-50">
        Add to cart
      </button>
      <button type="button" disabled={disabled} onClick={() => void add(true)}
        className="min-h-12 flex-1 rounded-xl bg-[#18d3e8] px-3 py-3 text-sm font-black uppercase text-black disabled:opacity-60">
        {busy || "Buy now"}
      </button>
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:pb-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
          Custom{" "}
          <span className="bg-linear-to-r from-[#d94cb3] to-[#18d3e8] bg-clip-text text-transparent">T-shirts</span>
        </h1>
        <p className="mt-2 text-base text-white/75">1 shirt or 1,000. Upload your design. Check out.</p>
      </div>

      {draft.restored && <div className="mt-4"><DraftNote onStartOver={draft.startOver} /></div>}

      {hasOne && (
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3">
          {([
            { m: "one" as Mode, t: "1 shirt", s: `No minimum · from $${Math.min(...(single?.variants.map((v) => Number(v.price)) ?? [25]))}` },
            { m: "bulk" as Mode, t: "12 or more", s: maxPct ? `Buy more, save up to ${maxPct}%` : "Wholesale price" },
          ]).map((o) => (
            <button key={o.m} type="button" aria-pressed={mode === o.m} onClick={() => setMode(o.m)}
              className={"rounded-2xl border p-4 text-center transition " + (mode === o.m ? "border-[#18d3e8] bg-[#18d3e8]/10 ring-2 ring-[#18d3e8]/40" : "border-white/15 bg-surface")}>
              <div className="font-display text-2xl font-black uppercase">{o.t}</div>
              <div className="mt-1 text-xs text-white/70">{o.s}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div>
          <section>
            <h2 className={h2}>1 · Pick your shirt</h2>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {STYLES.map((s) => {
                const on = style === s.name;
                const p = stylePrice(s);
                return (
                  <button key={s.name} type="button" aria-pressed={on} onClick={() => setStyle(s.name)}
                    className={"overflow-hidden rounded-2xl border text-center transition " + (on ? "border-[#18d3e8] ring-2 ring-[#18d3e8]/50" : "border-white/15 bg-surface")}>
                    <div className="bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/one-shirt/${s.long ? "tee-long" : "tee-short"}-front.jpg`} alt={`${s.label}, ${s.sub.toLowerCase()}`}
                        className="mx-auto h-40 w-full object-contain sm:h-48" loading="lazy" />
                    </div>
                    <div className="px-2 py-3">
                      <div className="text-sm font-bold leading-tight">{s.label}</div>
                      <div className="text-xs text-white/60">{s.sub}</div>
                      <div className="mt-1 font-display text-xl font-black text-[#d9f000]">
                        {mode === "bulk" ? "from " : ""}${Number.isFinite(p) ? p.toFixed(p % 1 ? 2 : 0) : "—"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {mode === "one" && <p className="mt-2 text-xs text-white/55">1 shirt comes in black. Want other colors? Pick “12 or more”.</p>}
          </section>

          {mode === "bulk" && (
            <section className="mt-8">
              <h2 className={h2}>2 · Colors & sizes</h2>
              {volumeTiers.length > 0 && (
                <div className="mb-3">
                  <BulkPricingLadder tiers={volumeTiers} minQuantity={MIN} unitPrice={bulkBase} totalQuantity={totalQuantity} />
                </div>
              )}
              <div className="mb-3 flex flex-wrap gap-2.5">
                {colorChoices.map((c) => (
                  <ColorSwatch key={c} name={c} active={openColors.includes(c)}
                    onClick={() => (openColors.includes(c) ? removeColor(c) : addColor(c))} />
                ))}
              </div>
              {openColors.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-center text-xs text-white/60">
                  Tap one or more colors. Each one opens its own sizes.
                </p>
              ) : (
                <div className="space-y-3">
                  {openColors.map((color) => {
                    const ct = Object.values(colorSizeQty[color] ?? {}).reduce((a, b) => a + b, 0);
                    return (
                      <div key={color} className="overflow-hidden rounded-xl border border-white/15 bg-white/3">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: colorHex(color) ?? "#888" }} />
                            <span className="text-sm font-bold">{color}</span>
                            {ct > 0 && <span className="text-[11px] text-white/60">{ct} pcs</span>}
                          </div>
                          <button type="button" onClick={() => removeColor(color)} className="text-[11px] text-white/60 hover:text-red-300">Remove</button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-3">
                          {(sizeOption?.values ?? []).map((sz) => {
                            const v = bulkVariant(color, sz);
                            const out = v && !v.availableForSale;
                            return (
                              <div key={sz} className={"flex items-center justify-between gap-2 " + (out ? "opacity-50" : "")}>
                                <span className="text-sm font-semibold">{sz}</span>
                                <SizeQtyStepper value={colorSizeQty[color]?.[sz] ?? 0} disabled={!!out} onChange={(n) => setCS(color, sz, n)} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {totalQuantity > 0 && totalQuantity < MIN && !mix.qualifies && (
                <p className="mt-2 text-xs text-amber-300">Add {MIN - totalQuantity} more to reach the minimum of {MIN}.</p>
              )}
              {volumeTiers.length > 0 && cartGarmentLines.length === 0 && (
                <BulkProgress tiers={volumeTiers} totalQuantity={totalQuantity} subtotal={totalPrice} unitPrice={bulkBase} />
              )}
              <div className="mt-3">
                <MixMatchPanel status={mix} thisStyleQty={totalQuantity} productTitle={bulk.title} ownMinimum={MIN} cartLines={cartGarmentLines} />
              </div>
            </section>
          )}

          <section className="mt-8" ref={artRef}>
            <h2 className={h2}>{mode === "bulk" ? "3" : "2"} · Upload your designs</h2>
            <TeeDesigner photoKey={photoKey} colorHex={previewColor} chest={chest} setChest={setChest} logos={logos} setLogos={setLogos} />
            {mode === "bulk" && previewColor && (
              <p className="mt-2 text-center text-xs text-white/55">Shirt color is a preview of your first color.</p>
            )}
          </section>
        </div>

        <div className="mt-8 space-y-6 lg:sticky lg:top-24 lg:mt-0 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/30 lg:p-5">
          {mode === "one" && (
            <section>
              <h2 className={h2}>3 · Size</h2>
              <div className="grid grid-cols-5 gap-2">
                {ONE_SIZES.map((z) => (
                  <button key={z} type="button" className={chip(size === z) + " px-1"} onClick={() => setSize(z)}>{z}</button>
                ))}
              </div>
              {size === "2XL" && <p className="mt-1 text-xs text-white/55">2XL is +$4.</p>}
            </section>
          )}

          <section>
            <h2 className={h2}>{mode === "one" ? "4" : "4"} · Proof</h2>
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
                  <span className="block text-xs text-white/65">Fastest. Prints exactly like your picture.</span>
                </span>
              </button>
            </div>
          </section>

          {mode === "one" && (
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
          )}
          {mode === "bulk" && <p className="text-xs text-white/60">Bulk orders take 5–12 business days. Need it faster? Email info@printlaserstitch.com.</p>}

          <textarea className={field} rows={2} placeholder="Notes for us (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="hidden lg:block">
            {mode === "bulk" && volumePct > 0 && (
              <p className="mb-2 text-sm font-bold text-[#d9f000]">🎉 You save ${volumeSavings.toFixed(2)} ({volumePct}% off)</p>
            )}
            {mode === "bulk" && upcomingTier && totalQuantity > 0 && (
              <p className="mb-2 text-xs text-white/70">Add {upcomingTier.qtyNeeded} more to get {upcomingTier.percent}% off</p>
            )}
            <div className="mb-3 flex items-end justify-between">
              <span className="text-sm text-white/70">{mode === "bulk" ? `Total · ${totalQuantity} shirts` : "Total"}</span>
              <span className="font-display text-4xl font-black text-[#d9f000]">${total.toFixed(2)}</span>
            </div>
            {buttons("")}
            {(err || upError) && <p className="mt-2 text-sm text-[#ff9aa2]">{err || upError}</p>}
            <p className="mt-2 text-center text-xs text-white/50">Custom item. Final sale unless we make a mistake.</p>
            <p className="mt-1 text-center text-xs text-white/50">
              Your design is saved on this device for 30 days.{" "}
              <Link href="/signup?redirect=/products/tshirts" className="underline">Create an account</Link> to keep it everywhere.
            </p>
          </div>
          {(err || upError) && <p className="text-sm text-[#ff9aa2] lg:hidden">{err || upError}</p>}
          <p className="text-center text-xs text-white/50 lg:hidden">Your design is saved on this device for 30 days.</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0b0f]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="leading-tight">
            <div className="text-xs text-white/60">{mode === "bulk" ? `${totalQuantity} shirts` : `Total${rush ? " (rush)" : ""}`}</div>
            <div className="font-display text-3xl font-black text-[#d9f000]">${total.toFixed(2)}</div>
          </div>
          {buttons("flex-1")}
        </div>
      </div>
    </section>
  );
}
