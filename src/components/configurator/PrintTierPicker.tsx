"use client";

import { parseSizeInches } from "@/lib/parse-size";

/**
 * Tier-style pickers for print products whose Shopify variants already
 * encode Size × (Print Sides) × Quantity, e.g. Flyers. Every price shown is
 * read straight from the variants, so the cards stay in sync with Shopify.
 */

type Opt = { id: string; name: string; values: string[] };
type Variant = {
  id: string;
  price: string;
  selectedOptions: { name: string; value: string }[];
};

export const isQuantityOptionName = (n: string) => /^quantity$/i.test(n.trim());
export const isSidesOptionName = (n: string) =>
  /^(print\s*sides|sides|layout)$/i.test(n.trim());

function priceFor(
  variants: Variant[],
  selected: Record<string, string>,
  override: Record<string, string>,
): number | null {
  const want = { ...selected, ...override };
  const v = variants.find((x) =>
    x.selectedOptions.every((o) => want[o.name] === o.value),
  );
  return v ? Number(v.price) : null;
}

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const each = (n: number) => `$${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`;
const fmtIn = (n: number) => String(n);

/** "5 Inch x 7 Inch (Invitation/Event)" → { dims: "5 × 7″", nick: "Invitation/Event" } */
function splitSizeLabel(label: string) {
  const s = parseSizeInches(label);
  const nick = label.match(/\(([^)]+)\)/)?.[1] ?? null;
  return {
    size: s,
    dims: s ? `${fmtIn(s.width)} × ${fmtIn(s.height)}″` : label,
    nick,
  };
}

export function sortedSizeValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const A = parseSizeInches(a);
    const B = parseSizeInches(b);
    if (!A || !B) return 0;
    return A.width * A.height - B.width * B.height;
  });
}

export function perPieceLabel(
  selected: Record<string, string>,
  options: Opt[],
  total: number,
): string | null {
  const q = options.find((o) => isQuantityOptionName(o.name));
  const qty = q ? Number(selected[q.name]) : NaN;
  if (!Number.isFinite(qty) || qty <= 0 || total <= 0) return null;
  return `${each(total / qty)} each`;
}

function Shape({ w, h }: { w: number; h: number }) {
  const box = 30;
  const scale = box / Math.max(w, h);
  return (
    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center" aria-hidden>
      <span
        className="rounded-[3px] border-2 border-current bg-current/10"
        style={{ width: Math.max(8, w * scale), height: Math.max(8, h * scale) }}
      />
    </span>
  );
}

export function SizeCards({
  opt,
  variants,
  selected,
  setOption,
}: {
  opt: Opt;
  variants: Variant[];
  selected: Record<string, string>;
  setOption: (name: string, value: string) => void;
}) {
  const qtyName = Object.keys(selected).find(isQuantityOptionName);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {sortedSizeValues(opt.values).map((v) => {
        const { size, dims, nick } = splitSizeLabel(v);
        const active = v === selected[opt.name];
        // Cheapest price for this size with the customer's other choices.
        const qtyValues = qtyName
          ? variants
              .flatMap((x) => x.selectedOptions)
              .filter((o) => o.name === qtyName)
              .map((o) => o.value)
          : [];
        const from = qtyName
          ? Math.min(
              ...[...new Set(qtyValues)]
                .map((q) => priceFor(variants, selected, { [opt.name]: v, [qtyName]: q }))
                .filter((p): p is number => p !== null),
            )
          : priceFor(variants, selected, { [opt.name]: v });
        return (
          <button
            key={v}
            type="button"
            onClick={() => setOption(opt.name, v)}
            aria-pressed={active}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
              active
                ? "border-[#d9f000] bg-[#d9f000]/10 text-[#d9f000] shadow-[0_0_24px_rgba(217,240,0,0.15)]"
                : "border-border-soft bg-white/3 text-foreground-muted hover:border-white/25 hover:bg-white/6"
            }`}
          >
            {size && <Shape w={size.width} h={size.height} />}
            <span className="min-w-0">
              <span className={`block font-headline text-sm font-bold ${active ? "text-[#d9f000]" : "text-foreground"}`}>
                {dims}
              </span>
              {nick && (
                <span className="block truncate text-[11px] leading-tight">{nick}</span>
              )}
              {from !== null && Number.isFinite(from) && (
                <span className="block text-[11px] font-semibold text-[#18d3e8]">
                  from {money(from)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function QuantityTierCards({
  opt,
  variants,
  selected,
  setOption,
}: {
  opt: Opt;
  variants: Variant[];
  selected: Record<string, string>;
  setOption: (name: string, value: string) => void;
}) {
  const tiers = [...opt.values]
    .sort((a, b) => Number(a) - Number(b))
    .map((v) => {
      const qty = Number(v);
      const total = priceFor(variants, selected, { [opt.name]: v });
      return { v, qty, total, unit: total !== null && qty > 0 ? total / qty : null };
    });
  const baseUnit = tiers.find((t) => t.unit !== null)?.unit ?? null;
  const bestUnit = Math.min(...tiers.map((t) => t.unit ?? Infinity));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiers.map((t) => {
        const active = t.v === selected[opt.name];
        const save =
          baseUnit && t.unit !== null ? Math.round((1 - t.unit / baseUnit) * 100) : 0;
        const best = t.unit !== null && t.unit === bestUnit && tiers.length > 1;
        return (
          <button
            key={t.v}
            type="button"
            onClick={() => setOption(opt.name, t.v)}
            aria-pressed={active}
            className={`relative flex flex-col items-center rounded-xl border px-2 pb-2.5 pt-4 text-center transition active:scale-[0.98] ${
              active
                ? "border-[#d9f000] bg-[#d9f000]/10 shadow-[0_0_24px_rgba(217,240,0,0.15)]"
                : "border-border-soft bg-white/3 hover:border-white/25 hover:bg-white/6"
            }`}
          >
            {(best || save > 0) && (
              <span
                className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-headline text-[9px] font-black uppercase tracking-wide ${
                  best ? "accent-gradient text-black" : "bg-[#18d3e8]/15 text-[#18d3e8]"
                }`}
              >
                {best ? "Best value" : `Save ${save}%`}
              </span>
            )}
            <span className={`font-display text-xl font-black tabular-nums ${active ? "text-[#d9f000]" : "text-foreground"}`}>
              {t.qty.toLocaleString("en-US")}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">pcs</span>
            {t.total !== null && (
              <>
                <span className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
                  {money(t.total)}
                </span>
                <span className="text-[11px] tabular-nums text-foreground-muted">
                  {each(t.unit!)} each
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SidesPicker({
  opt,
  variants,
  selected,
  setOption,
}: {
  opt: Opt;
  variants: Variant[];
  selected: Record<string, string>;
  setOption: (name: string, value: string) => void;
}) {
  const prices = opt.values.map((v) => priceFor(variants, selected, { [opt.name]: v }));
  const samePrice =
    prices.length > 1 && prices.every((p) => p !== null && p === prices[0]);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {opt.values.map((v) => {
          const active = v === selected[opt.name];
          const both = /back|both|double|2/i.test(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => setOption(opt.name, v)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                active
                  ? "border-[#d9f000] bg-[#d9f000]/10 text-[#d9f000]"
                  : "border-border-soft bg-white/3 text-foreground hover:bg-white/6"
              }`}
            >
              <span className="relative h-5 w-5" aria-hidden>
                {both && (
                  <span className="absolute left-1.5 top-0 h-4 w-3.5 rounded-[2px] border-2 border-current opacity-50" />
                )}
                <span className="absolute bottom-0 left-0 h-4 w-3.5 rounded-[2px] border-2 border-current bg-background" />
              </span>
              {v}
            </button>
          );
        })}
      </div>
      {samePrice && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#18d3e8]">
          <span aria-hidden>🎉</span> Double-sided printing at no extra cost
        </p>
      )}
    </div>
  );
}
