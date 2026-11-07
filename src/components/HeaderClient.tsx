"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import CartIcon from "./CartIcon";
import SearchBar from "./SearchBar";
import CategoryIcon, { type CategoryIconName } from "./header/CategoryIcons";

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

const PHONE_DISPLAY = "(772) 985-2854";
const PHONE_HREF = "tel:+17729852854";

/** The icon tiles under the search bar, in the order customers shop. */
const CATEGORY_STRIP: {
  label: string;
  href: string;
  icon: CategoryIconName;
  color: string;
}[] = [
  { label: "Stickers", href: "/products/vinyl-stickers", icon: "stickers", color: "#d94cb3" },
  { label: "Apparel", href: "/collections/custom-apparel", icon: "tshirts", color: "#18d3e8" },
  { label: "Polos", href: "/products/embroidered-polos", icon: "polos", color: "#60a5fa" },
  { label: "Business Cards", href: "/products/business-cards", icon: "cards", color: "#ff9f43" },
  { label: "Flyers", href: "/products/flyers", icon: "flyers", color: "#4ade80" },
  { label: "Posters", href: "/products/posters", icon: "posters", color: "#a78bfa" },
  { label: "Banners", href: "/products/banners", icon: "banners", color: "#d9f000" },
  { label: "Signs & Decals", href: "/signage-quotes", icon: "signs", color: "#fb7185" },
  { label: "Engraving", href: "/products/engraved-cups", icon: "engraving", color: "#2dd4bf" },
  { label: "All Products", href: "/collections", icon: "all", color: "#f5f5f5" },
];

const UTILITY_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Sign & Decal Builder", href: "/signage-quotes" },
  { label: "Design Your Wrap", href: "/wrap-designer" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "University", href: "https://printlaserstitchuniversity.com/", external: true },
  { label: "Portal", href: "https://printlaserstitch.app/", external: true },
];

function PhoneIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function HeaderClient({
  collections = [],
  customer = null,
}: {
  collections?: HeaderCollection[];
  customer?: HeaderCustomer | null;
}) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // After the visitor scrolls down, the utility bar and category strip tuck
  // away so the sticky header shrinks to just logo + search + account + cart.
  const [compact, setCompact] = useState(false);

  // Left/right arrows for the swipeable category row (phones).
  const stripRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ left: false, right: true });
  function updateEdges() {
    const el = stripRef.current;
    if (!el) return;
    setEdge({
      left: el.scrollLeft > 24,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }
  function scrollStrip(dir: -1 | 1) {
    stripRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }
  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, []);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      // Two thresholds (hysteresis) so it doesn't flicker near the boundary.
      setCompact((prev) => (prev ? y > 40 : y > 140));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const firstName = customer
    ? customer.firstName || customer.displayName.split(" ")[0] || customer.email
    : null;

  function isActive(href: string) {
    if (href === "/collections") return pathname === "/collections";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-background/90 backdrop-blur-md">
      <style>{`@keyframes plsTileIn{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){[style*="plsTileIn"]{animation:none!important}}`}</style>
      {/* Utility bar (desktop only; collapses on scroll) */}
      <div
        className={`hidden grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-300 lg:grid ${
          compact ? "!grid-rows-[0fr] opacity-0" : "opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-b border-border-soft bg-white/[0.025]">
            <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 text-xs text-foreground-muted sm:px-6 lg:px-8">
              <span className="font-headline tracking-wider uppercase">
                Custom printing · embroidery · engraving — Stuart, FL
              </span>
              <nav className="flex items-center gap-2">
                {UTILITY_LINKS.map((l) => {
                  const cls = `inline-flex items-center gap-1 rounded-full border px-4 py-1.5 font-headline text-[13px] font-semibold tracking-wide transition duration-200 hover:-translate-y-0.5 active:scale-95 ${
                    l.label === "Contact"
                      ? "border-transparent accent-gradient text-black shadow-md shadow-[#d9f000]/20 hover:brightness-110"
                      : "border-border-strong bg-white/[0.06] text-foreground hover:border-[#d9f000]/60 hover:bg-[#d9f000]/10 hover:text-[#d9f000]"
                  }`;
                  return l.external ? (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      {l.label}
                      <span aria-hidden className="text-[10px] opacity-70">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href} className={cls}>
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main row: logo · big search · phone · account · cart */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-6 lg:px-8">
        <Link href="/" aria-label="Print Laser Stitch home" className="shrink-0">
          <Image
            src="/logo.avif"
            alt="Print Laser Stitch"
            width={52}
            height={52}
            className="h-11 w-11 sm:h-12 sm:w-12"
            priority
          />
        </Link>

        <SearchBar
          size="large"
          placeholder="Search stickers, shirts, banners, signs…"
          className="hidden min-w-0 flex-1 lg:block"
        />

        <div className="ml-auto hidden items-center gap-2 lg:ml-0 lg:flex">
          <a
            href={PHONE_HREF}
            className="group hidden items-center gap-2.5 rounded-2xl px-3 py-1.5 transition hover:bg-white/5 xl:flex"
          >
            <span className="text-[#18d3e8]">
              <PhoneIcon />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] text-foreground-muted">
                Need a quote? Call us
              </span>
              <span className="block font-headline text-[15px] font-bold tracking-wide">
                {PHONE_DISPLAY}
              </span>
            </span>
          </a>

          {customer ? (
            <div
              className="relative"
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-2xl px-3 py-1.5 text-left transition hover:bg-white/5"
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full accent-gradient text-sm font-bold text-black">
                  {(customer.firstName || customer.displayName || customer.email)
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="hidden leading-tight xl:block">
                  <span className="block text-[11px] text-foreground-muted">Account</span>
                  <span className="block max-w-28 truncate font-headline text-[15px] font-bold tracking-wide">
                    Hi, {firstName}
                  </span>
                </span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full pt-2">
                  <div className="w-56 overflow-hidden rounded-2xl border border-border-soft bg-background-soft shadow-2xl shadow-black/40">
                    <div className="border-b border-border-soft px-4 py-3">
                      <div className="text-xs text-foreground-muted">Signed in as</div>
                      <div className="truncate text-sm font-medium">{customer.email}</div>
                    </div>
                    <Link href="/account" className="block px-4 py-2.5 text-sm hover:bg-white/5">
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
              className="flex items-center gap-2.5 rounded-2xl px-3 py-1.5 transition hover:bg-white/5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border-strong text-foreground">
                <UserIcon />
              </span>
              <span className="hidden leading-tight xl:block">
                <span className="block text-[11px] text-foreground-muted">Account</span>
                <span className="block font-headline text-[15px] font-bold tracking-wide">
                  Login / Sign up
                </span>
              </span>
            </Link>
          )}
          <CartIcon />
        </div>

        {/* Mobile-only: cart icon + hamburger sit on the right */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <a
            href={PHONE_HREF}
            aria-label={`Call ${PHONE_DISPLAY}`}
            className="grid h-10 w-10 place-items-center rounded-full border border-border-soft bg-white/5 text-[#18d3e8] hover:bg-white/10"
          >
            <PhoneIcon />
          </a>
          <CartIcon />
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-full border border-border-soft bg-white/5 p-2.5 text-foreground hover:bg-white/10"
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

      {/* Mobile search row */}
      <div className="px-4 pb-2.5 sm:px-6 lg:hidden">
        <SearchBar size="large" placeholder="Search products…" className="w-full" />
      </div>

      {/* Category icon strip (collapses on scroll) */}
      <div
        className={`grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-300 ${
          compact ? "!grid-rows-[0fr] opacity-0" : "opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <nav
            aria-label="Shop by category"
            className="relative border-t border-border-soft bg-background-soft/60"
          >
            <ul
              ref={stripRef}
              onScroll={updateEdges}
              className="mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 lg:justify-between lg:gap-1.5 lg:overflow-visible lg:px-8 lg:py-2.5 [&::-webkit-scrollbar]:hidden"
            >
              {CATEGORY_STRIP.map((c, i) => {
                const active = isActive(c.href);
                return (
                  <li
                    key={c.label}
                    className="shrink-0 snap-start lg:min-w-0 lg:flex-1"
                    style={{ animation: `plsTileIn 0.5s ease-out ${i * 45}ms both` }}
                  >
                    <Link
                      href={c.href}
                      aria-current={active ? "page" : undefined}
                      style={{ "--c": c.color } as CSSProperties}
                      className={`group flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 transition duration-200 active:scale-95 lg:h-full lg:w-full lg:flex-col lg:gap-1.5 lg:whitespace-normal lg:rounded-2xl lg:px-2 lg:py-2.5 lg:text-center ${
                        active
                          ? "border-[#d9f000]/50 bg-[#d9f000]/10 text-[#d9f000]"
                          : "border-[color-mix(in_srgb,var(--c)_35%,transparent)] bg-[color-mix(in_srgb,var(--c)_12%,transparent)] text-foreground-muted lg:border-transparent lg:bg-transparent lg:hover:-translate-y-0.5 lg:hover:border-border-strong lg:hover:bg-white/[0.05] lg:hover:text-[#d9f000]"
                      }`}
                    >
                      <CategoryIcon
                        name={c.icon}
                        className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 lg:h-7 lg:w-7 ${
                          active ? "" : "text-[var(--c)]"
                        }`}
                      />
                      <span className="font-headline text-[13px] font-semibold leading-tight tracking-wide text-foreground/90 group-hover:text-foreground lg:text-[12px]">
                        {c.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {(["left", "right"] as const).map((side) => {
              const show = side === "left" ? edge.left : edge.right;
              return (
                <button
                  key={side}
                  type="button"
                  tabIndex={show ? 0 : -1}
                  aria-label={`Scroll categories ${side}`}
                  onClick={() => scrollStrip(side === "left" ? -1 : 1)}
                  className={`absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border-strong bg-background/95 text-foreground shadow-lg shadow-black/40 backdrop-blur transition duration-200 active:scale-90 lg:hidden ${
                    side === "left" ? "left-1" : "right-1"
                  } ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points={side === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
                  </svg>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border-soft bg-background-soft lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            <a
              href={PHONE_HREF}
              className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-border-strong px-4 py-2.5 font-headline text-[15px] font-semibold tracking-wide text-[#18d3e8] active:scale-[0.98]"
            >
              <PhoneIcon /> Call {PHONE_DISPLAY}
            </a>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {[
                { label: "Home", href: "/" },
                { label: "Design Your Wrap", href: "/wrap-designer" },
                { label: "Sign & Decal Builder", href: "/signage-quotes" },
                { label: "Gallery", href: "/gallery" },
                { label: "Blog", href: "/blog" },
                { label: "About Us", href: "/about" },
                { label: "Contact Us", href: "/contact" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-border-soft bg-white/[0.04] px-3 py-2.5 text-center font-headline text-sm font-semibold tracking-wide transition active:scale-95 active:bg-[#d9f000]/10"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://printlaserstitchuniversity.com/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-border-soft bg-white/[0.04] px-3 py-2.5 text-center font-headline text-sm font-semibold tracking-wide transition active:scale-95"
              >
                University ↗
              </a>
              <a
                href="https://printlaserstitch.app/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-border-soft bg-white/[0.04] px-3 py-2.5 text-center font-headline text-sm font-semibold tracking-wide transition active:scale-95"
              >
                Portal ↗
              </a>
            </div>
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
