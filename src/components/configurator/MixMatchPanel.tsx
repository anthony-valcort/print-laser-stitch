"use client";

import Link from "next/link";
import {
  METHOD_LABEL,
  MIX_MINIMUM,
  MIX_MIN_PER_METHOD,
  decorationMethod,
  type MixLine,
  type MixStatus,
} from "@/lib/apparel-mix";

/**
 * Mix & Match status for the apparel builder.
 *
 * The point of this panel is to make the shared minimum feel like an
 * opportunity rather than a wall: a customer who only wants 6 polos sees
 * that 6 more of anything gets them there, and that the bulk tier counts
 * the whole apparel order rather than each style on its own.
 */
export default function MixMatchPanel({
  status,
  thisStyleQty,
  productTitle,
  ownMinimum,
  cartLines,
}: {
  status: MixStatus;
  /** Pieces of the style currently being configured. */
  thisStyleQty: number;
  productTitle: string;
  /** This style's own standalone minimum. */
  ownMinimum: number;
  /** Garment lines already in the cart. */
  cartLines: MixLine[];
}) {
  const inCart = cartLines.reduce((n, l) => n + l.quantity, 0);
  if (thisStyleQty === 0 && inCart === 0) return null;

  // A style that already clears its own standalone minimum can be ordered on
  // its own, so the panel must never tell that customer they're short — it
  // would contradict the Add to cart button. For them this is an upsell:
  // anything else they add rides the same bulk tier.
  const soloOk = thisStyleQty >= ownMinimum;
  const blocked = !soloOk && !status.qualifies;

  const pct = Math.min(100, Math.round((status.pieces / MIX_MINIMUM) * 100));
  const thisMethod = decorationMethod(productTitle);

  return (
    <div className="animate-nudge-in rounded-2xl border border-[#18d3e8]/30 bg-[#18d3e8]/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">
            🧩
          </span>
          <span className="font-headline text-xs font-bold uppercase tracking-[0.16em] text-[#18d3e8]">
            Mix &amp; Match
          </span>
        </div>
        {!blocked ? (
          <span className="check-in inline-flex items-center gap-1 rounded-full bg-[#d9f000] px-2.5 py-1 font-headline text-[10px] font-black uppercase tracking-wide text-black">
            <span aria-hidden>✓</span> Minimum met
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-wide text-foreground-muted">
            {status.pieces} / {MIX_MINIMUM} pcs
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-snug text-foreground/90">
        {!blocked ? (
          <>
            Your apparel order qualifies
            {status.discountPercent > 0 && (
              <>
                {" "}
                and earns{" "}
                <strong className="text-[#d9f000]">
                  {status.discountPercent}% off
                </strong>{" "}
                across every garment
              </>
            )}
            . Anything else you add counts toward the same bulk tier.
          </>
        ) : (
          status.message ??
          `Combine any garments to reach ${MIX_MINIMUM} pieces.`
        )}
      </p>

      {blocked && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full accent-gradient transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* What's counting toward the total right now. */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {thisStyleQty > 0 && (
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5">
            {thisStyleQty} {METHOD_LABEL[thisMethod]} here
          </span>
        )}
        {cartLines.map((l) => (
          <span
            key={l.productTitle}
            className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5"
          >
            {l.quantity} in cart · {l.productTitle.split(" ").slice(0, 2).join(" ")}
          </span>
        ))}
      </div>

      {status.shortfalls.length > 0 && (
        <p className="mt-2 text-[11px] text-amber-300">
          Each decoration type needs {MIX_MIN_PER_METHOD} pieces — embroidery and
          printing are set up separately.
        </p>
      )}

      {blocked && (
        <Link
          href="/collections/custom-apparel"
          className="mt-3 inline-flex items-center gap-1.5 font-headline text-xs font-bold uppercase tracking-wider text-[#18d3e8] hover:text-[#d9f000]"
        >
          Browse garments to add
          <span aria-hidden>→</span>
        </Link>
      )}

      {!blocked && status.nextTier && (
        <p className="mt-2 text-[11px] font-medium text-foreground-muted">
          Add {status.nextTier.qtyNeeded} more to reach{" "}
          {status.nextTier.percent}% off.
        </p>
      )}
    </div>
  );
}
