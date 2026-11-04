"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/interactions";

/**
 * A money figure that rolls to its new value instead of snapping, so the
 * customer can see the total responding to what they just changed. Falls
 * back to the plain number when the visitor prefers reduced motion.
 */
export default function AnimatedPrice({
  value,
  className = "",
  prefix = "$",
  duration = 420,
}: {
  value: number;
  className?: string;
  prefix?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    if (prefersReducedMotion()) {
      fromRef.current = to;
      setShown(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out so it settles rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {shown.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
