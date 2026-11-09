"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MONTHS } from "@/lib/built-together";

export type TreeItem = {
  id: string;
  href: string;
  title: string;
  shortTitle: string;
  month: number;
  day: number;
  category: string;
  customerName: string | null;
  stat: string | null;
  summary: string;
  cover: { url: string; alt: string; width: number; height: number } | null;
  hasVideo: boolean;
  draft: boolean;
};

export default function YearTree({
  items,
  year,
  maxMonth,
}: {
  items: TreeItem[];
  year: number;
  /** Last month to show in the guide (current month for the current year). */
  maxMonth: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );
  const visible = items.filter((i) => !cat || i.category === cat);
  const monthsWith = new Set(items.map((i) => i.month));

  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.5;
      const done = Math.min(Math.max(-r.top + window.innerHeight * 0.3, 0), Math.max(total, 1));
      setProgress(total > 0 ? done / total : 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [visible.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Group by month (keeps month headings)
  let lastMonth = 0;

  return (
    <div>
      <noscript>
        <style>{`.bt-card-wrap{grid-template-rows:1fr!important}.bt-card-wrap>div{visibility:visible!important}`}</style>
      </noscript>

      {/* Sticky progress */}
      <div className="sticky top-0 z-30 -mx-4 h-1 bg-white/5 sm:-mx-6" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-accent to-cyan-400 transition-[width] duration-150 motion-reduce:transition-none"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Month guide */}
      <nav aria-label={`Months of ${year}`} className="my-5 flex flex-wrap justify-center gap-1.5">
        {MONTHS.map((m, idx) => {
          const mo = idx + 1;
          if (mo > maxMonth) return null;
          const has = monthsWith.has(mo);
          return has ? (
            <a
              key={m}
              href={`#m-${mo}`}
              className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent hover:text-black"
            >
              {m.slice(0, 3)} <span aria-hidden="true">●</span>
            </a>
          ) : (
            <span
              key={m}
              className="rounded-full border border-border-soft px-3 py-1.5 text-xs text-foreground-muted/60"
            >
              {m.slice(0, 3)}
            </span>
          );
        })}
      </nav>

      {categories.length > 1 && (
        <details className="mx-auto mb-6 max-w-xl text-center">
          <summary className="inline-block cursor-pointer rounded-full border border-border-soft px-4 py-1.5 text-xs font-semibold text-foreground-muted hover:bg-white/5">
            Filter by type{cat ? `: ${cat}` : ""}
          </summary>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setCat(null)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${!cat ? "border-accent bg-accent text-black" : "border-border-soft hover:bg-white/5"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c === cat ? null : c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${cat === c ? "border-accent bg-accent text-black" : "border-border-soft hover:bg-white/5"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </details>
      )}

      <div ref={wrap} className="relative mx-auto max-w-5xl pb-10">
        {/* Center line */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-[21px] top-0 w-[3px] rounded-full bg-gradient-to-b from-accent/80 via-cyan-400/60 to-transparent md:left-1/2 md:-translate-x-1/2"
        />

        <ol className="relative list-none space-y-2">
          {visible.map((it, idx) => {
            const left = idx % 2 === 0;
            const showMonth = it.month !== lastMonth;
            lastMonth = it.month;
            const open = openId === it.id;
            const cardId = `bt-card-${it.id.split("/").pop()}`;
            return (
              <li key={it.id} className="relative" id={showMonth ? `m-${it.month}` : undefined}>
                {showMonth && (
                  <div className="relative mb-3 mt-6 flex items-center pl-14 md:justify-center md:pl-0">
                    <span className="rounded-full border border-border-soft bg-[#0a0a0a] px-4 py-1.5 font-headline text-sm font-bold uppercase tracking-widest text-foreground-muted">
                      {MONTHS[it.month - 1]}
                    </span>
                  </div>
                )}
                <div className="relative grid grid-cols-[44px_1fr] gap-x-3 md:grid-cols-[1fr_56px_1fr] md:gap-x-0">
                  {/* Node */}
                  <div className="relative col-start-1 row-start-1 flex justify-center md:col-start-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : it.id)}
                      aria-expanded={open}
                      aria-controls={cardId}
                      aria-label={`${it.shortTitle}${it.customerName ? `, ${it.customerName}` : ""}. ${open ? "Close" : "Open"} preview`}
                      title={it.title}
                      className={`peer relative z-10 mt-4 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 bg-[#0a0a0a] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.9)] outline-none transition duration-300 hover:scale-110 focus-visible:ring-4 focus-visible:ring-accent/60 motion-reduce:transition-none ${open ? "scale-110 border-accent shadow-[0_0_30px_rgba(217,240,0,0.4)]" : "border-accent/60"}`}
                    >
                      {it.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.cover.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-accent" />
                      )}
                    </button>
                  </div>

                  {/* Branch + chip + card */}
                  <div
                    className={`col-start-2 row-start-1 min-w-0 ${left ? "md:col-start-1 md:pr-6 md:text-right" : "md:col-start-3 md:pl-6"}`}
                  >
                    <div
                      className={`relative rounded-2xl border bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] transition duration-300 motion-reduce:transition-none ${open ? "border-accent/70" : "border-border-soft hover:border-accent/40"}`}
                    >
                      {/* branch connector */}
                      <span
                        aria-hidden="true"
                        className={`absolute top-8 hidden h-[2px] w-6 md:block ${open ? "bg-accent" : "bg-accent/40"} ${left ? "-right-6" : "-left-6"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : it.id)}
                        aria-expanded={open}
                        aria-controls={cardId}
                        className={`flex w-full min-h-[48px] items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${left ? "md:flex-row-reverse md:text-right" : ""}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold uppercase tracking-widest text-foreground-muted">
                            {MONTHS[it.month - 1].slice(0, 3)} {it.day}
                            {it.category ? ` · ${it.category}` : ""}
                            {it.draft ? " · DRAFT" : ""}
                          </span>
                          <span className="block font-headline text-lg font-bold leading-tight">
                            {it.shortTitle}
                          </span>
                          {it.customerName && (
                            <span className="block truncate text-xs text-foreground-muted">
                              {it.customerName}
                            </span>
                          )}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-soft text-lg transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-45 bg-accent text-black" : ""}`}
                        >
                          +
                        </span>
                      </button>

                      <div
                        id={cardId}
                        role="region"
                        aria-label={it.title}
                        className={`bt-card-wrap grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className={`overflow-hidden ${open ? "" : "invisible"} text-left`}>
                          <div className="pt-3">
                            {it.cover && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.cover.url}
                                alt={it.cover.alt}
                                width={it.cover.width}
                                height={it.cover.height}
                                loading="lazy"
                                className="aspect-[16/10] w-full rounded-xl object-cover"
                              />
                            )}
                            <h3 className="mt-3 font-headline text-2xl font-bold leading-tight">
                              {it.title}
                            </h3>
                            {it.customerName && (
                              <p className="text-sm font-semibold text-accent">{it.customerName}</p>
                            )}
                            {it.stat && (
                              <p className="mt-1 text-sm font-bold">{it.stat}</p>
                            )}
                            {it.summary && (
                              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                                {it.summary}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <Link
                                href={it.href}
                                className="accent-gradient inline-flex min-h-[44px] items-center rounded-md px-5 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black hover:brightness-110"
                              >
                                Explore This Story
                              </Link>
                              {it.hasVideo && (
                                <span className="text-xs text-foreground-muted">▶ Video inside</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
