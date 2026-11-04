"use client";

/**
 * Small feedback helpers that make the site feel like it's responding to the
 * customer rather than just redrawing. Every one is a no-op when the browser
 * doesn't support it or the visitor asked for reduced motion.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A short buzz on phones that support it — the same cue a native app gives
 * when a choice lands. Desktop browsers simply ignore it.
 */
export function tapFeedback(pattern: number | number[] = 8) {
  if (typeof navigator === "undefined") return;
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* Safari and locked-down browsers: nothing to do. */
  }
}

/** Slightly stronger cue for a completed action (added to cart, approved). */
export function successFeedback() {
  tapFeedback([10, 40, 18]);
}

/**
 * Flies a copy of the product image into the cart icon so the customer sees
 * where their item went. Falls back silently when either element is missing.
 */
export function flyToCart(sourceEl: HTMLElement | null) {
  if (typeof document === "undefined" || !sourceEl) return;
  if (prefersReducedMotion()) return;

  const target = document.querySelector<HTMLElement>("[data-cart-icon]");
  if (!target) return;

  const from = sourceEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const ghost = sourceEl.cloneNode(true) as HTMLElement;
  ghost.style.cssText = `position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;margin:0;border-radius:14px;object-fit:cover;z-index:9999;pointer-events:none;opacity:0.95;box-shadow:0 12px 40px rgba(0,0,0,.45)`;
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 0.95 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(0.6)`,
        opacity: 0.9,
        offset: 0.6,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.12)`,
        opacity: 0,
      },
    ],
    { duration: 700, easing: "cubic-bezier(.5,-0.1,.4,1)" },
  );

  anim.onfinish = () => {
    ghost.remove();
    target.dispatchEvent(new CustomEvent("cart-bump"));
  };
  anim.oncancel = () => ghost.remove();
}
