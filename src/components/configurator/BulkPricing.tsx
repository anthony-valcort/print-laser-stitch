"use client";

import type { VolumeTier } from "@/lib/volume-discounts";

/**
 * Bulk-pricing visuals for garment builders:
 *  - <BulkPricingLadder>: tier cards (icon + per-shirt price + % off), the
 *    tier the customer is in glows.
 *  - <BulkProgress>: live progress bar toward the next tier with a
 *    "you're saving / add N more to save" message.
 * Display only — checkout re-applies the same tiers server-side.
 */

type Tier = { minQty: number; percent: number; label: string };

function buildTiers(tiers: VolumeTier[], minQuantity: number): Tier[] {
  const asc = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const first = asc[0]?.minQty ?? Infinity;
  const starter: Tier = {
    minQty: minQuantity,
    percent: 0,
    label: `${minQuantity}–${first - 1}`,
  };
  return [starter, ...asc.map((t) => ({ ...t, label: `${t.minQty}+` }))];
}

const money = (n: number) => `$${n.toFixed(2)}`;

/** Little stack of shirts — more shirts for bigger tiers. */
function ShirtStack({ count, active }: { count: number; active: boolean }) {
  return (
    <div className="relative flex h-8 items-end justify-center" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`-mx-1 h-6 w-6 drop-shadow transition-transform duration-300 sm:h-7 sm:w-7 ${
            active ? "text-[#d9f000]" : "text-foreground/45"
          }`}
          style={{
            transform: `translateY(${(count - 1 - i) * -1}px) rotate(${(i - (count - 1) / 2) * 8}deg)`,
            zIndex: i,
          }}
          fill="currentColor"
        >
          <path d="M8.5 3 4 5.2 2 9.5l3 1.4 1-1.7V21h12V9.2l1 1.7 3-1.4-2-4.3L15.5 3c-.4 1.4-1.8 2.4-3.5 2.4S8.9 4.4 8.5 3Z" />
        </svg>
      ))}
    </div>
  );
}

export function BulkPricingLadder({
  tiers,
  minQuantity,
  unitPrice,
  totalQuantity,
  unitLabel = "shirt",
}: {
  tiers: VolumeTier[];
  minQuantity: number;
  unitPrice: number;
  totalQuantity: number;
  unitLabel?: string;
}) {
  if (!(unitPrice > 0) || tiers.length === 0) return null;
  const ladder = buildTiers(tiers, minQuantity);
  const activeIdx = ladder.reduce(
    (acc, t, i) => (totalQuantity >= t.minQty ? i : acc),
    totalQuantity >= minQuantity ? 0 : -1,
  );
  const best = ladder[ladder.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d9f000]/30 bg-linear-to-br from-[#d9f000]/10 via-surface to-[#18d3e8]/10">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div>
          <div className="font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
            Buy more, save more
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            Bulk pricing is applied automatically
          </div>
        </div>
        {best && best.percent > 0 && (
          <span className="shrink-0 rounded-full accent-gradient px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-wider text-black">
            Up to {best.percent}% off
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-3 sm:gap-2 sm:p-4">
        {ladder.map((t, i) => {
          const active = i === activeIdx;
          const reached = i <= activeIdx;
          const price = unitPrice * (1 - t.percent / 100);
          return (
            <div
              key={t.minQty}
              className={`relative flex flex-col items-center rounded-xl border px-1 pb-2.5 pt-3 text-center transition-all duration-300 sm:px-2 ${
                active
                  ? "animate-glow scale-[1.04] border-[#d9f000] bg-[#d9f000]/15"
                  : reached
                    ? "border-[#d9f000]/30 bg-white/4"
                    : "border-border-soft bg-background/50"
              }`}
            >
              {t.percent > 0 && (
                <span
                  className={`absolute -top-2 rounded-full px-1.5 py-0.5 font-headline text-[9px] font-black uppercase tracking-wide sm:text-[10px] ${
                    active
                      ? "bg-[#d9f000] text-black"
                      : "bg-[#18d3e8]/20 text-[#18d3e8]"
                  }`}
                >
                  −{t.percent}%
                </span>
              )}
              <ShirtStack count={i + 1} active={reached} />
              <div className="mt-1.5 font-headline text-[11px] font-bold leading-tight sm:text-xs">
                {t.label}
                <span className="block text-[9px] font-medium uppercase tracking-wider text-foreground-muted sm:text-[10px]">
                  pcs
                </span>
              </div>
              <div
                className={`mt-1 font-display text-sm font-black tabular-nums sm:text-base ${
                  active ? "text-[#d9f000]" : "text-foreground"
                }`}
              >
                {money(price)}
              </div>
              <div className="text-[9px] text-foreground-muted sm:text-[10px]">
                per {unitLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BulkProgress({
  tiers,
  totalQuantity,
  subtotal,
  unitPrice,
  unitLabel = "shirt",
}: {
  tiers: VolumeTier[];
  totalQuantity: number;
  subtotal: number;
  unitPrice: number;
  unitLabel?: string;
}) {
  const asc = [...tiers].sort((a, b) => a.minQty - b.minQty);
  if (asc.length === 0) return null;

  const current = [...asc].reverse().find((t) => totalQuantity >= t.minQty);
  const next = asc.find((t) => totalQuantity < t.minQty);
  const pct = current?.percent ?? 0;
  const saving = Math.round(subtotal * pct) / 100;

  // Bar: each tier gets an equal slice, so early progress is visible.
  const stops = [0, ...asc.map((t) => t.minQty)];
  const slice = 100 / asc.length;
  let fill = 100;
  for (let i = 0; i < asc.length; i++) {
    const lo = stops[i];
    const hi = stops[i + 1];
    if (totalQuantity < hi) {
      fill = i * slice + ((totalQuantity - lo) / (hi - lo)) * slice;
      break;
    }
  }

  const avg = totalQuantity > 0 ? subtotal / totalQuantity : unitPrice;
  const nextSaving = next
    ? Math.round(avg * next.minQty * next.percent) / 100
    : 0;
  const plural = (n: number) => `${unitLabel}${n === 1 ? "" : "s"}`;

  return (
    <div className="mt-3 rounded-xl border border-border-soft bg-background/60 p-3">
      <div
        key={`${pct}-${next?.minQty ?? "max"}`}
        className="flex animate-fade-up items-start gap-2 text-[13px] leading-snug"
        style={{ animationDuration: "0.4s" }}
      >
        <span className="text-base leading-none" aria-hidden>
          {next ? (pct > 0 ? "🎉" : "🔥") : "🏆"}
        </span>
        <p>
          {pct > 0 && (
            <>
              <span className="font-bold text-[#d9f000]">
                You&apos;re saving {pct}% ({money(saving)})!
              </span>{" "}
            </>
          )}
          {next ? (
            <>
              Add{" "}
              <span className="font-bold text-foreground">
                {next.minQty - totalQuantity} more {plural(next.minQty - totalQuantity)}
              </span>{" "}
              to unlock{" "}
              <span className="font-bold text-[#18d3e8]">
                {next.percent}% off
              </span>
              <span className="text-foreground-muted">
                {" "}
                — about {money(nextSaving)} back on {next.minQty} pcs.
              </span>
            </>
          ) : (
            <span className="text-foreground">
              You&apos;ve unlocked our best bulk price.
            </span>
          )}
        </p>
      </div>

      {/* Progress bar with tier milestones */}
      <div className="relative mt-3 pb-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-linear-to-r from-[#18d3e8] via-[#d9f000] to-[#d9f000] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(2, Math.min(100, fill))}%` }}
          />
        </div>
        {asc.map((t, i) => {
          const left = (i + 1) * slice;
          const hit = totalQuantity >= t.minQty;
          const last = i === asc.length - 1;
          return (
            <div
              key={t.minQty}
              className={`absolute top-0 flex flex-col ${
                last ? "items-end" : "-translate-x-1/2 items-center"
              }`}
              style={last ? { right: 0 } : { left: `${left}%` }}
            >
              <div
                className={`-mt-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border-2 transition-colors duration-300 ${
                  hit
                    ? "border-[#d9f000] bg-[#d9f000]"
                    : "border-white/25 bg-background"
                }`}
              />
              <div
                className={`mt-1 whitespace-nowrap font-headline text-[10px] font-bold ${
                  hit ? "text-[#d9f000]" : "text-foreground-muted"
                }`}
              >
                {t.minQty}+ · {t.percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
