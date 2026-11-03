"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reveals every `[data-reveal]` element as it scrolls into view by adding
 * `.is-revealed` (styles live in globals.css). Mounted once in the root
 * layout, it re-scans on every route change and watches for elements added
 * later (filters, client-loaded lists), so any page can opt in with just
 * the attribute.
 * - Hidden state only applies when JS runs and the visitor hasn't asked for
 *   reduced motion, so content is never stuck invisible.
 * - Stagger with an inline `--reveal-delay` style.
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const reveal = (el: Element) => el.classList.add("is-revealed");

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
    );

    const scan = (root: ParentNode) => {
      root
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)")
        .forEach((el) => io.observe(el));
    };
    scan(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-reveal]:not(.is-revealed)")) io.observe(node);
          scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: never leave anything hidden for long (e.g. print, odd
    // embeds, very tall elements that never cross the threshold).
    const failSafe = window.setTimeout(() => {
      document
        .querySelectorAll("[data-reveal]:not(.is-revealed)")
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight) reveal(el);
        });
    }, 2500);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(failSafe);
    };
  }, [pathname]);

  return null;
}
