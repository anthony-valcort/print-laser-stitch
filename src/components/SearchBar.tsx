"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/app/api/search/route";

export default function SearchBar({
  className = "",
  size = "default",
  placeholder = "Search products…",
}: {
  className?: string;
  /** "large" is the prominent header search: taller, with a search button. */
  size?: "default" | "large";
  placeholder?: string;
}) {
  const router = useRouter();
  const large = size === "large";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: SearchResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) {
            setOpen(false);
            router.push(`/products/${results[0].handle}`);
          } else {
            setOpen(true);
          }
        }}
        className={`flex items-center gap-2 border transition-all duration-200 ${
          large
            ? "bg-white/[0.07] py-1.5 pl-5 pr-1.5 focus-within:border-[#d9f000]/60 focus-within:bg-white/[0.1] focus-within:shadow-[0_0_0_4px_rgba(217,240,0,0.12)]"
            : "bg-white/5 px-3.5 py-2"
        } ${large ? "border-border-strong" : "border-border-soft"} ${
          showPanel ? "rounded-t-3xl rounded-b-none border-b-transparent" : "rounded-full"
        }`}
      >
        {!large && (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-foreground-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
        <input
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          type="text"
          placeholder={placeholder}
          className={`w-full min-w-24 flex-1 bg-transparent outline-none placeholder:text-foreground-muted/60 ${
            large ? "py-1.5 text-[15px]" : "text-sm"
          }`}
        />
        {large && (
          <button
            type="submit"
            aria-label="Search"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full accent-gradient text-black shadow-md shadow-[#d9f000]/25 transition hover:brightness-110 active:scale-95"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
      </form>

      {showPanel && (
        <div
          className={`absolute right-0 top-full left-0 z-50 max-h-96 w-full overflow-y-auto rounded-b-3xl border border-t-0 bg-background-soft shadow-2xl shadow-black/40 ${
            large ? "border-border-strong" : "border-border-soft sm:left-auto sm:w-96"
          }`}
        >
          {loading ? (
            <div className="px-4 py-4 text-center text-sm text-foreground-muted">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-foreground-muted">
              No products found.
            </div>
          ) : (
            <ul className="divide-y divide-border-soft">
              {results.map((r) => (
                <li key={r.handle}>
                  <Link
                    href={`/products/${r.handle}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
                  >
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white/10">
                      {r.thumbnail ? (
                        <Image src={r.thumbnail} alt="" fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-xs">📦</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                    </span>
                    {r.price && (
                      <span className="shrink-0 text-xs font-semibold text-foreground-muted">
                        ${Number(r.price).toFixed(2)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
