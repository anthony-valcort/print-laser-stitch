"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/lib/cart-store";
import {
  MIX_MINIMUM,
  mixStatus,
  type MixLine,
} from "@/lib/apparel-mix";
import { hasVolumePricing } from "@/lib/volume-discounts";

/**
 * "Your apparel mix" panel. Shows every decorated garment already in the
 * cart alongside the one being configured, so a customer who can't reach a
 * single style's minimum can see exactly how close the combined order is.
 */

/** Garment lines already in the cart, excluding the style being edited. */
export function useCartGarmentLines(excludeTitle?: string): MixLine[] {
  const { items } = useCart();
  return useMemo(
    () =>
      items
        .filter(
          (i): i is Extract<typeof i, { kind: "tshirt" }> =>
            i.kind === "tshirt",
        )
        .map((i) => ({
          productTitle: i.productTitle,
          quantity: i.quantity || 0,
        }))
        .filter(
          (l) =>
            hasVolumePricing(l.productTitle) &&
            l.quantity > 0 &&
            l.productTitle !== excludeTitle,
        ),
    [items, excludeTitle],
  );
}

function ShirtIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M8.5 2 12 4.6 15.5 2 21 4.8v5.1h-3V22H6V9.9H3V4.8z" />
    </svg>
  );
}

export default function MixAndMatch({
  productTitle,
  currentQty,
  ownMinimum,
}: {
  productTitle: string;
  /** Pieces of the style being configured right now. */
  currentQty: number;
  /** This style's standalone minimum. */
  ownMinimum: number;
}) {
  const cartLines = useCartGarmentLines(productTitle);
  const otherPieces = cartLines.reduce((a, l) => a + l.quantity, 0);

  const status = useMemo(
    () =>
      mixStatus([
        ...cartLines,
        { productTitle, quantity: currentQty },
      ]),
    [cartLines, productTitle, currentQty],
  );

  // Nothing to say when this style already stands on its own and there's no
  // other apparel in the cart to mix with.
  if (otherPieces === 0 && currentQty >= ownMinimum) return null;
  if (!hasVolumePricing(productTitle)) return null;

  const pct = Math.min(100, (status.pieces / MIX_MINIMUM) * 100);
  const unlocked = status.qualifies;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors duration-300 ${
        unlocked
          ? "border-[#d9f000]/40 bg-[#d9f000]/[0.07]"
          : "border-border-soft bg-white/3"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="text-base">
              🧩
            </span>
            <h3 className="font-headline text-sm font-bold uppercase tracking-wide">
              Mix &amp; Match
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
            Mix any garments to reach {MIX_MINIMUM} pieces — polos, tees, tanks,
            hoodies. One logo across the order.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-headline text-[11px] font-black tabular-nums ${
            unlocked
              ? "accent-gradient text-black"
              : "bg-white/10 text-foreground"
          }`}
        >
          {status.pieces}/{MIX_MINIMUM}
        </span>
      </div>

      {/* Combined progress toward the shared minimum */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full accent-gradient transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* What's counting toward it */}
      {(cartLines.length > 0 || currentQty > 0) && (
        <ul className="mt-3 space-y-1.5">
          {cartLines.map((l) => (
            <li
              key={l.productTitle}
              className="flex items-center gap-2 text-xs text-foreground-muted"
            >
              <ShirtIcon className="h-3.5 w-3.5 shrink-0 text-[#18d3e8]" />
              <span className="min-w-0 flex-1 truncate">{l.productTitle}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {l.quantity}
              </span>
            </li>
          ))}
          {currentQty > 0 && (
            <li className="flex items-center gap-2 text-xs">
              <ShirtIcon className="h-3.5 w-3.5 shrink-0 text-[#d9f000]" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {productTitle}{" "}
                <span className="text-foreground-muted">(this order)</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[#d9f000]">
                {currentQty}
              </span>
            </li>
          )}
        </ul>
      )}

      <p
        className={`mt-3 text-xs font-semibold ${
          unlocked ? "text-[#d9f000]" : "text-foreground"
        }`}
      >
        {unlocked ? (
          <>
            ✓ Minimum met across your mix
            {status.discountPercent > 0 && (
              <> — and you&apos;re getting {status.discountPercent}% bulk off</>
            )}
          </>
        ) : (
          <>
            Add {status.shortBy} more {status.shortBy === 1 ? "piece" : "pieces"}{" "}
            from any garment to qualify
          </>
        )}
      </p>

      {!unlocked && (
        <Link
          href="/collections/custom-apparel"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-xs font-semibold transition hover:border-white/30 hover:bg-white/10 active:scale-[0.98]"
        >
          Browse garments to add
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}
