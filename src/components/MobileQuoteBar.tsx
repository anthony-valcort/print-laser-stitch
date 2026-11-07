"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Routes with their own buy/quote actions (or private pages) skip the bar. */
const HIDDEN_PREFIXES = [
  "/products/",
  "/cart",
  "/account",
  "/admin",
  "/order",
  "/mobile-proof",
  "/login",
  "/signup",
  "/forgot-password",
  "/decal-quote",
  "/signage-quotes",
  "/vehicle-stickers",
];

/**
 * Phone-only sticky action bar: Call + Get a Quote. Slides in once the
 * visitor scrolls past the hero and tucks away when the footer is on screen.
 */
export default function MobileQuoteBar() {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hidden) return;
    const footer = document.querySelector("footer");
    let footerVisible = false;
    const update = () => setShow(window.scrollY > 520 && !footerVisible);

    let io: IntersectionObserver | undefined;
    if (footer && "IntersectionObserver" in window) {
      io = new IntersectionObserver(([entry]) => {
        footerVisible = !!entry?.isIntersecting;
        update();
      });
      io.observe(footer);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      io?.disconnect();
    };
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 px-3 pt-3 backdrop-blur-lg transition-transform duration-300 ease-out sm:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <a
          href="tel:+17729852854"
          tabIndex={show ? 0 : -1}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-white/5 px-4 py-3 font-headline text-sm font-bold uppercase tracking-wider text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call
        </a>
        <Link
          href="/signage-quotes"
          tabIndex={show ? 0 : -1}
          className="inline-flex items-center justify-center gap-2 rounded-xl accent-gradient px-4 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/25"
        >
          Get a Free Quote
        </Link>
      </div>
    </div>
  );
}
