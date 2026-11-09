"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type YearNode = {
  year: number;
  title: string;
  description: string;
  count: number;
};

const COL = 260; // px per year
const H = 190; // timeline height
const MID = 78; // baseline y of the line
const AMP = 16; // gentle wave

const yAt = (i: number) => MID - Math.sin(i * 0.95) * AMP - i * 3;
const xAt = (i: number) => COL * (i + 0.5);

/** Point on the smooth S-curve between year i and i+1 (t from 0 to 1). */
function curvePoint(i: number, t: number) {
  const x0 = xAt(i);
  const x1 = xAt(i + 1);
  const mx = (x0 + x1) / 2;
  const u = 1 - t;
  const x = u * u * u * x0 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x1;
  const y0 = yAt(i);
  const y1 = yAt(i + 1);
  const y = y0 + (y1 - y0) * (3 * t * t - 2 * t * t * t);
  return { x, y };
}

export default function YearTimeline({
  years,
  currentYear,
}: {
  years: YearNode[];
  currentYear: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const n = years.length;
  const width = Math.max(n * COL, 1);

  // Start with the newest chapter in view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = xAt(n - 1) - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [n]);

  let path = `M 0 ${yAt(0)} L ${xAt(0)} ${yAt(0)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = xAt(i);
    const x1 = xAt(i + 1);
    const mx = (x0 + x1) / 2;
    path += ` C ${mx} ${yAt(i)} ${mx} ${yAt(i + 1)} ${x1} ${yAt(i + 1)}`;
  }
  const endX = xAt(n - 1);
  const endY = yAt(n - 1);

  const scrollBy = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * COL, behavior: "smooth" });

  return (
    <div className="relative">
      <style>{`
        @keyframes bt-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        .bt-line { stroke-dasharray: 1; stroke-dashoffset: 0; animation: bt-draw 1.6s ease-out both; }
        @keyframes bt-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(217,240,0,.35); } 50% { box-shadow: 0 0 0 14px rgba(217,240,0,0); } }
        .bt-pulse { animation: bt-pulse 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .bt-line, .bt-pulse { animation: none; } }
      `}</style>

      {n > 3 && (
        <>
          <button
            type="button"
            aria-label="Earlier years"
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-[60px] z-20 hidden h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-black/70 text-lg backdrop-blur hover:bg-white/10 md:flex"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Later years"
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-[60px] z-20 hidden h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-black/70 text-lg backdrop-blur hover:bg-white/10 md:flex"
          >
            →
          </button>
        </>
      )}

      <div
        ref={scroller}
        className="overflow-x-auto overflow-y-hidden px-2 pb-4 [scroll-snap-type:x_proximity] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Years timeline"
      >
        <ol
          className="relative mx-auto list-none"
          style={{ width, height: H + 120 }}
        >
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={width}
            height={H}
            viewBox={`0 0 ${width} ${H}`}
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bt-grad" x1="0" x2="1">
                <stop offset="0" stopColor="#d9f000" stopOpacity="0.15" />
                <stop offset="0.6" stopColor="#d9f000" stopOpacity="0.9" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <path
              d={path}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={path}
              pathLength={1}
              className="bt-line"
              stroke="url(#bt-grad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Future: the line keeps going */}
            <line
              x1={endX}
              y1={endY}
              x2={width}
              y2={endY - 6}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
              strokeDasharray="2 8"
              strokeLinecap="round"
            />
            {/* Small milestone dots between years */}
            {years.slice(0, -1).flatMap((y, i) =>
              Array.from({ length: Math.min(y.count, 8) }).map((_, k, arr) => {
                const p = curvePoint(i, (k + 1) / (arr.length + 1));
                return (
                  <circle
                    key={`${y.year}-${k}`}
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="#0a0a0a"
                    stroke="#d9f000"
                    strokeWidth="2"
                  />
                );
              }),
            )}
            {/* The newest year's dots sit just after its node */}
            {Array.from({ length: Math.min(years[n - 1]?.count ?? 0, 8) }).map(
              (_, k) => (
                <circle
                  key={`last-${k}`}
                  cx={endX + 44 + k * 14}
                  cy={endY - (k * 6) / 8}
                  r="4.5"
                  fill="#0a0a0a"
                  stroke="#d9f000"
                  strokeWidth="2"
                />
              ),
            )}
          </svg>

          {years.map((y, i) => {
            const isFirst = i === 0;
            const isLatest = i === n - 1;
            return (
              <li
                key={y.year}
                className="absolute [scroll-snap-align:center]"
                style={{
                  left: xAt(i) - COL / 2,
                  top: 0,
                  width: COL,
                }}
              >
                <Link
                  href={`/built-together/${y.year}`}
                  aria-label={`${y.year}: ${y.title || "Open this year"}. ${y.count} ${y.count === 1 ? "story" : "stories"}`}
                  className="group flex flex-col items-center text-center outline-none"
                >
                  <span
                    className="relative flex h-[92px] w-[92px] items-center justify-center rounded-full border-2 border-accent/70 bg-gradient-to-b from-white/15 to-white/[0.03] shadow-[0_14px_30px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.25)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-110 group-hover:border-accent group-hover:shadow-[0_0_40px_rgba(217,240,0,0.35)] group-focus-visible:ring-4 group-focus-visible:ring-accent/60"
                    style={{ marginTop: yAt(i) - 46 }}
                  >
                    <span className={isLatest ? "bt-pulse absolute inset-0 rounded-full" : "hidden"} aria-hidden="true" />
                    {isFirst && (
                      <svg
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-[#0a0a0a] p-1.5 text-accent ring-1 ring-accent/50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 11l9-8 9 8" />
                        <path d="M5 10v10h14V10" />
                        <path d="M10 20v-6h4v6" />
                      </svg>
                    )}
                    <span className="font-display text-2xl font-bold tracking-tight">
                      {y.year}
                    </span>
                  </span>
                  <span className="mt-3 block font-headline text-lg font-bold leading-tight">
                    {y.title || "Open chapter"}
                  </span>
                  <span className="mt-0.5 block text-xs text-foreground-muted">
                    {y.count > 0
                      ? `${y.count} ${y.count === 1 ? "story" : "stories"}`
                      : "Coming soon"}
                    {y.year === currentYear ? " · Latest chapter" : ""}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent opacity-80 transition group-hover:bg-accent group-hover:text-black group-hover:opacity-100">
                    Open {y.year} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-1 text-center text-xs text-foreground-muted md:hidden">
        Swipe sideways, then tap a year
      </p>
    </div>
  );
}
