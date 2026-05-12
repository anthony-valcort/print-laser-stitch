"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  categories as fallbackCategories,
  type Category,
} from "@/lib/categories";
import CartIcon from "./CartIcon";

export type HeaderCustomer = {
  firstName: string | null;
  displayName: string;
  email: string;
};

export default function HeaderClient({
  categories = fallbackCategories,
  customer = null,
}: {
  categories?: Category[];
  customer?: HeaderCustomer | null;
}) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide the standalone "Custom Signage Quote" entry from the Products dropdown
  // because it gets its own top-level "Calculator" link.
  const productCategories = categories.filter(
    (c) => c.slug !== "signage-quotes",
  );

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
                <div className="grid w-md grid-cols-2 gap-1 rounded-2xl border border-border-soft bg-background-soft p-2 shadow-2xl shadow-black/40">
                  {productCategories.map((c) => (
                    <Link
                      key={c.slug}
                      href={c.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                    >
                      {c.imageUrl ? (
                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/10">
                          <Image
                            src={c.imageUrl}
                            alt=""
                            fill
                            sizes="32px"
                            className="object-contain"
                          />
                        </span>
                      ) : (
                        <span className="text-lg">{c.emoji ?? "📦"}</span>
                      )}
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
            href="/decal-quote"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Quick Quote
          </Link>
          <Link
            href="/signage-quotes"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Decal Signage
          </Link>
          <Link
            href="/about"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            About
          </Link>
          <a
            href="https://printlaserstitch.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Portal
          </a>
          {customer ? (
            <div
              className="relative"
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full accent-gradient text-xs font-bold text-white">
                  {(customer.firstName || customer.displayName || customer.email)
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="hidden lg:inline">
                  {customer.firstName || customer.displayName.split(" ")[0]}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${accountOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full pt-2">
                  <div className="w-56 overflow-hidden rounded-2xl border border-border-soft bg-background-soft shadow-2xl shadow-black/40">
                    <div className="border-b border-border-soft px-4 py-3">
                      <div className="text-xs text-foreground-muted">
                        Signed in as
                      </div>
                      <div className="truncate text-sm font-medium">
                        {customer.email}
                      </div>
                    </div>
                    <Link
                      href="/account"
                      className="block px-4 py-2.5 text-sm hover:bg-white/5"
                    >
                      My orders
                    </Link>
                    <form action="/api/auth/logout" method="post">
                      <button
                        type="submit"
                        className="block w-full px-4 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/10"
                      >
                        Log out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full accent-gradient px-4 py-2 text-sm font-semibold text-white shadow-md shadow-accent-strong/20 hover:opacity-95"
              >
                Sign up
              </Link>
            </>
          )}
          <CartIcon />
        </nav>

        {/* Mobile-only: cart icon + hamburger sit on the right */}
        <div className="flex items-center gap-2 md:hidden">
          <CartIcon />
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-full border border-border-soft bg-white/5 p-2 text-foreground hover:bg-white/10"
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
            <Link
              href="/decal-quote"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              🪟 Quick Quote
            </Link>
            <Link
              href="/signage-quotes"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              🪧 Decal Signage Calculator
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              About Us
            </Link>
            <a
              href="https://printlaserstitch.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              🔐 Portal
            </a>
            <div className="px-4 py-2 text-xs uppercase tracking-wider text-foreground-muted">
              Products
            </div>
            {productCategories.map((c) => (
              <Link
                key={c.slug}
                href={c.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm hover:bg-white/5"
              >
                {c.imageUrl ? (
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded bg-white/10">
                    <Image
                      src={c.imageUrl}
                      alt=""
                      fill
                      sizes="24px"
                      className="object-contain"
                    />
                  </span>
                ) : (
                  <span>{c.emoji ?? "📦"}</span>
                )}
                <span>{c.name}</span>
              </Link>
            ))}
            <div className="my-2 border-t border-border-soft" />
            {customer ? (
              <>
                <div className="px-4 py-2 text-xs uppercase tracking-wider text-foreground-muted">
                  {customer.email}
                </div>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
                >
                  My orders
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-300 hover:bg-red-500/10"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
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
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
