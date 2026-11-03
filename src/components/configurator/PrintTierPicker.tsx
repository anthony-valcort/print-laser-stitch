"use client";

import { parseSizeInches, type SizeUnit } from "@/lib/parse-size";

/**
 * Tier-style option pickers for print products: size cards that show the
 * real proportions and a "from" price, quantity cards with the per-piece
 * price and the saving against the smallest tier, and a front/back picker.
 *
 * Every price shown is read from the product's own Shopify variants, so
 * the cards can never drift from what checkout charges.
 *
 * Shopify option names vary a lot across Anthony's catalog ("Quantity",
 * "Bulk Quantity (Pack)", "Size - Qty - Price", "Qty + Prices", "Size &
 * Paper"…), so options are matched on shape rather than exact name.
 */

type Opt = { id: string; name: string; values: string[] };
type Variant = {
  id: string;
  price: string;
  selectedOptions: { name: string; value: string }[];
};

type PickerProps = {
  opt: Opt;
  variants: Variant[];
  selected: Record<string, string>;
  setOption: (name: string, value: string) => void;
  sizeUnit?: SizeUnit;
  /** Name of the product's quantity-tier option, when it has one. */
  qtyOptionName?: string;
};

/* ---------------------------------------------------------------- parsing */

/**
 * Piece count in a quantity-tier label: "250" → 250, "500Pcs" → 500,
 * "5 Cups" → 5. Ranges ("1-15 Cups") have no single count, so they return
 * null and the card falls back to showing the label with no per-piece math.
 */
export function parseTierQty(label: string): number | null {
  const s = label.replace(/,/g, "");
  if (/^\s*\d+(?:\.\d+)?\s*(?:-|–|to\s)\s*\d/i.test(s)) return null;
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** First number in a label, for sorting tiers low → high. */
function tierSortKey(label: string): number {
  const m = label.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
}

/**
 * True for an option that encodes quantity tiers — matched on the name
 * mentioning quantity/qty AND every value carrying a number, so a "Qty"
 * option with non-numeric values is left as plain buttons.
 */
export function isQuantityTierOption(opt: { name: string; values: string[] }) {
  if (!/\bqty\b|quantit/i.test(opt.name)) return false;
  if (opt.values.length < 2) return false;
  return opt.values.every((v) => /\d/.test(v));
}

/** True for a front/back-style option. */
export function isSidesOption(opt: { name: string; values: string[] }) {
  return /^(print\s*sides|sides|layout)$/i.test(opt.name.trim());
}

/** True for an option whose values are real width × height dimensions. */
export function isDimensionOption(opt: { name: string; values: string[] }) {
  if (isQuantityTierOption(opt)) return false;
  return opt.values.some((v) => parseSizeInches(v) !== null);
}

/** Which of a product's options (if any) the tier cards should render. */
export function tieredOptionKind(
  opt: { name: string; values: string[] },
): "quantity" | "sides" | "size" | null {
  if (isQuantityTierOption(opt)) return "quantity";
  if (isSidesOption(opt)) return "sides";
  if (isDimensionOption(opt)) return "size";
  return null;
}

/** True when a product has at least one option worth showing as tier cards. */
export function hasTieredOptions(options: { name: string; values: string[] }[]) {
  return options.some((o) => tieredOptionKind(o) !== null);
}

/* -------------------------------------------------------------- formatting */

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const each = (n: number) => `$${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`;

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

/**
 * "5 Inch x 7 Inch (Invitation/Event)" → 5 × 7″, "Invitation/Event"
 * `18" x 12" Single-Sided`            → 18 × 12″, "Single-Sided"
 * Anything left over after the dimensions becomes the sub-label, so two
 * sizes that differ only in their trailing words stay distinguishable.
 */
function splitSizeLabel(label: string, unit: SizeUnit) {
  const size = parseSizeInches(label);
  if (!size) return { size, dims: label, nick: null as string | null };
  const mark = unit === "ft" ? "′" : "″";
  const paren = label.match(/\(([^)]+)\)/)?.[1];
  const rest = label
    .replace(/\([^)]*\)/g, " ")
    .replace(
      /\d+(?:\.\d+)?\s*(?:in(?:ch(?:es)?)?\.?|["″”])?\s*[x×]\s*\d+(?:\.\d+)?\s*(?:in(?:ch(?:es)?)?\.?|["″”])?/i,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return {
    size,
    dims: `${size.width} × ${size.height}${mark}`,
    nick: paren ?? (rest.length > 1 ? rest : null),
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

/** "$0.24 each" for the current selection, or null when there's no tier. */
export function perPieceLabel(
  selected: Record<string, string>,
  options: Opt[],
  total: number,
): string | null {
  const q = options.find(isQuantityTierOption);
  if (!q) return null;
  const qty = parseTierQty(selected[q.name] ?? "");
  if (!qty || qty <= 1 || total <= 0) return null;
  return `${each(total / qty)} each`;
}

/** "1,000 pcs" for the price header, or null. */
export function tierCountLabel(
  selected: Record<string, string>,
  options: Opt[],
): string | null {
  const q = options.find(isQuantityTierOption);
  if (!q) return null;
  const raw = selected[q.name];
  if (!raw) return null;
  const qty = parseTierQty(raw);
  return qty ? `${qty.toLocaleString("en-US")} pcs` : raw;
}

/* ----------------------------------------------------------------- pickers */

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
  sizeUnit = "in",
  qtyOptionName,
}: PickerProps) {
  const qtyName = qtyOptionName;
  const qtyValues = qtyName
    ? [
        ...new Set(
          variants
            .flatMap((x) => x.selectedOptions)
            .filter((o) => o.name === qtyName)
            .map((o) => o.value),
        ),
      ]
    : [];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {sortedSizeValues(opt.values).map((v) => {
        const { size, dims, nick } = splitSizeLabel(v, sizeUnit);
        const active = v === selected[opt.name];
        const candidates = qtyName
          ? qtyValues
              .map((q) =>
                priceFor(variants, selected, { [opt.name]: v, [qtyName]: q }),
              )
              .filter((p): p is number => p !== null)
          : [priceFor(variants, selected, { [opt.name]: v })].filter(
              (p): p is number => p !== null,
            );
        const from = candidates.length ? Math.min(...candidates) : null;
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
              <span
                className={`block font-headline text-sm font-bold ${
                  active ? "text-[#d9f000]" : "text-foreground"
                }`}
              >
                {dims}
              </span>
              {nick && (
                <span className="block truncate text-[11px] leading-tight">
                  {nick}
                </span>
              )}
              {from !== null && (
                <span className="block text-[11px] font-semibold text-[#18d3e8]">
                  {qtyValues.length > 1 ? "from " : ""}
                  {money(from)}
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
}: PickerProps) {
  const tiers = [...opt.values]
    .sort((a, b) => tierSortKey(a) - tierSortKey(b))
    .map((v) => {
      const qty = parseTierQty(v);
      const total = priceFor(variants, selected, { [opt.name]: v });
      return {
        v,
        qty,
        total,
        unit: total !== null && qty && qty > 0 ? total / qty : null,
      };
    });
  const baseUnit = tiers.find((t) => t.unit !== null)?.unit ?? null;
  const units = tiers.map((t) => t.unit).filter((u): u is number => u !== null);
  const bestUnit = units.length ? Math.min(...units) : null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiers.map((t) => {
        const active = t.v === selected[opt.name];
        const save =
          baseUnit && t.unit !== null
            ? Math.round((1 - t.unit / baseUnit) * 100)
            : 0;
        const best =
          t.unit !== null && t.unit === bestUnit && units.length > 1;
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
                  best
                    ? "accent-gradient text-black"
                    : "bg-[#18d3e8]/15 text-[#18d3e8]"
                }`}
              >
                {best ? "Best value" : `Save ${save}%`}
              </span>
            )}
            {t.qty ? (
              <>
                <span
                  className={`font-display text-xl font-black tabular-nums ${
                    active ? "text-[#d9f000]" : "text-foreground"
                  }`}
                >
                  {t.qty.toLocaleString("en-US")}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
                  pcs
                </span>
              </>
            ) : (
              <span
                className={`font-headline text-sm font-bold leading-tight ${
                  active ? "text-[#d9f000]" : "text-foreground"
                }`}
              >
                {t.v}
              </span>
            )}
            {t.total !== null && (
              <>
                <span className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
                  {money(t.total)}
                </span>
                {t.unit !== null && (
                  <span className="text-[11px] tabular-nums text-foreground-muted">
                    {each(t.unit)} each
                  </span>
                )}
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
}: PickerProps) {
  const prices = opt.values.map((v) =>
    priceFor(variants, selected, { [opt.name]: v }),
  );
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
