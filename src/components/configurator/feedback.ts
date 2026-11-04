"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Small interaction-feedback hooks shared by the configurators.
 *
 * The animations themselves live in globals.css behind a
 * `(scripting: enabled) and (prefers-reduced-motion: no-preference)` query,
 * so these hooks only ever toggle a data attribute — nothing here moves
 * anything for a customer who asked their device for less motion.
 */

/**
 * Marks the option a customer just tapped so its card can pop and throw a
 * ring, then clears the mark so the animation can run again next time.
 */
export function useJustPicked(resetMs = 520) {
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const mark = useCallback(
    (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      setPicked(value);
      timer.current = setTimeout(() => setPicked(null), resetMs);
    },
    [resetMs],
  );

  return {
    mark,
    /** Spread onto the card: `{...pickedProps(value)}`. */
    pickedProps: (value: string) =>
      picked === value ? { "data-just-picked": "1" as const } : {},
  };
}

/**
 * Flashes a number when it changes — the price reacting to the choice the
 * customer just made, so the cause and effect are obvious. Skips the very
 * first render so nothing flashes on page load.
 */
export function useFlashOnChange(value: number | string) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setFlash(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(false), 460);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return flash ? { "data-flash": "1" as const } : {};
}
