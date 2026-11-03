import type { CSSProperties } from "react";

/**
 * Inline style that staggers a `data-reveal` element's entrance.
 * Usage: <div data-reveal style={revealDelay(i * 90)}>
 */
export function revealDelay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

/** Inline style that staggers a CSS `animate-fade-up` entrance. */
export function fadeDelay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}
