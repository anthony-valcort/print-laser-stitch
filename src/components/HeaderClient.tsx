"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import CartIcon from "./CartIcon";
import SearchBar from "./SearchBar";

export type HeaderCustomer = {
  firstName: string | null;
  displayName: string;
  email: string;
};

export type HeaderCollection = {
  handle: string;
  title: string;
  imageUrl: string | null;
};

export default function HeaderClient({
  collections = [],
  customer = null,
}: {
  collections?: HeaderCollection[];
  customer?: HeaderCustomer | null;
}) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock background scroll while the mobile menu is open so scrolling the
  // (long) collection list doesn't scroll the page behind it.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const hasCollections = collections.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.avif"
            alt="Print Laser Stitch"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href="/"
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Home
          </Link>
          {hasCollections ? (
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <Link
                href="/collections"
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
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
              </Link>
              {productsOpen && (
                <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
                  <div className="w-md rounded-2xl border border-border-soft bg-background-soft p-2 shadow-2xl shadow-black/40">
                    <div className="grid grid-cols-2 gap-1">
                      {collections.map((c) => (
                        <Link
                          key={c.handle}
                          href={`/collections/${c.handle}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                        >
                          {c.imageUrl ? (
                            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/10">
                              <Image
                                src={c.imageUrl}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </span>
                          ) : (
                            <span className="text-lg">📦</span>
                          )}
                          <span className="font-medium">{c.title}</span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/collections"
                      className="mt-1 block rounded-xl border-t border-border-soft px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#18d3e8] hover:bg-white/5"
                    >
                      Browse all categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/collections"
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 hover:text-foreground hover:bg-white/5"
            >
              Products
            </Link>
          )}
          <Link
            href="/decal-quote"
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Signage Quote
          </Link>
          <Link
            href="/signage-quotes"
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Decal Calculator
          </Link>
          <Link
            href="/gallery"
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            Gallery
          </Link>
          <Link
            href="/about"
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/80 hover:text-foreground hover:bg-white/5"
          >
            About
          </Link>
          <div
            className="relative shrink-0"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/5"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full pt-2">
                <div className="w-48 overflow-hidden rounded-2xl border border-border-soft bg-background-soft shadow-2xl shadow-black/40">
                  <Link
                    href="/blog"
                    className="block px-4 py-3 text-sm hover:bg-white/5"
                  >
                    Blog
                  </Link>
                  <a
                    href="https://printlaserstitchuniversity.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5"
                  >
                    <Image
                      src="/university-logo.jpeg"
                      alt=""
                      width={18}
                      height={18}
                      className="h-4.5 w-4.5 shrink-0 rounded-full object-cover ring-1 ring-[#d94cb3]/40"
                    />
                    University
                  </a>
                  <a
                    href="https://printlaserstitch.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 text-sm hover:bg-white/5"
                  >
                    🔐 Portal
                  </a>
                </div>
              </div>
            )}
          </div>
          <SearchBar className="w-40 shrink-0 xl:w-56" />
          {customer ? (
            <div
              className="relative shrink-0"
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border-soft bg-white/5 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full accent-gradient text-xs font-bold text-black">
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
                      My account
                    </Link>
                    <Link
                      href="/account/orders"
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
            <Link
              href="/login"
              className="shrink-0 rounded-md accent-gradient px-4 py-2 font-headline text-sm font-bold whitespace-nowrap uppercase tracking-wider text-black shadow-md shadow-[#d9f000]/30 hover:brightness-110"
            >
              Login
            </Link>
          )}
          <CartIcon />
        </nav>

        {/* Mobile-only: cart icon + hamburger sit on the right */}
        <div className="flex items-center gap-2 lg:hidden">
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
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border-soft bg-background-soft lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            <div className="pb-2">
              <SearchBar className="w-full" />
            </div>
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
              🪟 Signage Quote
            </Link>
            <Link
              href="/signage-quotes"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              🪧 Decal Calculator
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              📰 Blog
            </Link>
            <Link
              href="/gallery"
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              🖼️ Gallery
            </Link>
            <a
              href="https://printlaserstitchuniversity.com/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/5"
            >
              <Image
                src="/university-logo.jpeg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-[#d94cb3]/40"
              />
              University
            </a>
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
            <Link
              href="/collections"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-xs uppercase tracking-wider text-foreground-muted hover:text-foreground"
            >
              <span>Products</span>
              <span className="text-[#18d3e8]">All →</span>
            </Link>
            {collections.map((c) => (
              <Link
                key={c.handle}
                href={`/collections/${c.handle}`}
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
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span>📦</span>
                )}
                <span>{c.title}</span>
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
                  My account
                </Link>
                <Link
                  href="/account/orders"
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
