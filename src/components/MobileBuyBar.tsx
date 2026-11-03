"use client";

import { useEffect, useState } from "react";

/**
 * Phone-only sticky summary for long product builders: shows the running
 * total and jumps to the real Add to Cart / checkout button (so all of the
 * builder's validation and messages stay in one place). Hidden while that
 * button is already on screen.
 */
export default function MobileBuyBar({
  total,
  targetId,
  label = "Review & add to cart",
}: {
  total: number;
  targetId: string;
  label?: string;
}) {
  const [targetVisible, setTargetVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    let io: IntersectionObserver | undefined;
    if (target && "IntersectionObserver" in window) {
      io = new IntersectionObserver(([entry]) =>
        setTargetVisible(!!entry?.isIntersecting),
      );
      io.observe(target);
    } else {
      setTargetVisible(false);
    }
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [targetId]);

  const show = scrolled && !targetVisible;

  function jump() {
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 px-3 pt-3 backdrop-blur-lg transition-transform duration-300 ease-out lg:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-headline text-[10px] uppercase tracking-[0.18em] text-foreground-muted">
            Total
          </div>
          <div className="font-display text-xl font-black tabular-nums text-[#d9f000]">
            {total > 0 ? `$${total.toFixed(2)}` : "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={jump}
          tabIndex={show ? 0 : -1}
          className="inline-flex items-center justify-center gap-2 rounded-xl accent-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/25 active:scale-[0.98]"
        >
          {label}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
