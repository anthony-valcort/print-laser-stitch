"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { categories } from "@/lib/categories";

export default function Header() {
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.avif"
            alt="Print Laser Stitch"
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Home
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
              onClick={() => setProductsOpen((v) => !v)}
            >
              Products
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${productsOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {productsOpen && (
              <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
                <div className="grid w-[28rem] grid-cols-2 gap-1 rounded-2xl border border-border-soft bg-background-soft p-2 shadow-2xl shadow-black/40">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={c.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <span className="text-lg">{c.emoji}</span>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-foreground-muted">
                          {c.tagline}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Signup
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Cart"
            className="relative rounded-full border border-border-soft bg-white/5 p-2 text-foreground hover:bg-white/10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full accent-gradient px-1 text-[10px] font-bold text-white">
              0
            </span>
          </button>
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-full border border-border-soft bg-white/5 p-2 text-foreground hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border-soft bg-background-soft md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            <Link
              href="/"
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <div className="px-4 py-2 text-xs uppercase tracking-wider text-foreground-muted">
              Products
            </div>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={c.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm hover:bg-white/5"
              >
                <span>{c.emoji}</span>
                <span>{c.name}</span>
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              Signup
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
