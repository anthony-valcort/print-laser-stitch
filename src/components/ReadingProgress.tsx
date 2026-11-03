"use client";

import { useEffect, useRef } from "react";

/** Thin neon bar under the header that fills as the reader scrolls a post. */
export default function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${pct})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-16 z-30 h-0.5 bg-white/5"
    >
      <div
        ref={bar}
        className="h-full origin-left bg-linear-to-r from-[#d9f000] via-[#18d3e8] to-[#d94cb3]"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
