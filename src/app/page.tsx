import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryGrid from "@/components/CategoryGrid";
import CountUp from "@/components/CountUp";
import TalkingAnthony from "@/components/TalkingAnthony";
import Stage from "@/components/sign-builder/Stage";
import { getAllCollections } from "@/lib/shopify-collections";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SERVICES_TICKER = [
  "Custom Embroidery",
  "Screen Printing",
  "DTF Transfers",
  "Laser Engraving",
  "Vinyl Stickers",
  "Signs & Banners",
  "Vehicle Graphics",
  "Business Cards",
  "Team Uniforms",
  "Custom Hats",
];

const TEAM_TIERS = [
  { qty: "24+", pct: 10, accent: "cyan" as const },
  { qty: "48+", pct: 15, accent: "yellow" as const, featured: true },
  { qty: "100+", pct: 20, accent: "magenta" as const },
];

/** Inline CSS variable for staggered scroll reveals. */
function delay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

export default async function Home() {
  const productCategories = await getAllCollections().catch(() => []);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* HERO — image first on phones (people buy with their eyes), split on desktop */}
        <section className="relative isolate overflow-x-clip">
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-6 sm:px-6 sm:pt-12 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:pb-20 lg:pt-24">
            {/* Copy */}
            <div className="order-2 text-center lg:order-1 lg:text-left">
              {/* The page's main heading (what Google reads first): services +
                  location, styled as the small eyebrow pill. */}
              <h1
                className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[10px] font-semibold uppercase tracking-[0.18em] text-[#18d3e8] sm:text-[11px] sm:tracking-[0.2em]"
                style={{ animationDelay: "60ms" }}
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18d3e8] opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
                </span>
                Custom printing, embroidery &amp; engraving · Stuart, FL
              </h1>

              <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
                <p className="glitch-text mx-auto mt-5 max-w-2xl font-display text-[2.6rem] font-black uppercase leading-[1.02] tracking-tight sm:text-5xl lg:mx-0 lg:text-6xl">
                  Bringing your <span className="sheen-text">vision</span>
                  <br className="hidden sm:inline" /> to life.
                </p>
              </div>

              <p
                className="mx-auto mt-5 max-w-xl animate-fade-up text-[15px] leading-relaxed text-foreground-muted sm:text-lg lg:mx-0"
                style={{ animationDelay: "260ms" }}
              >
                Premium custom printing, laser engraving and embroidery from
                our Stuart, Florida shop — built for businesses, teams,
                creators and car enthusiasts across the Treasure Coast. From
                vinyl stickers to embroidered polos, we print, stitch or etch
                it for you.
              </p>

              <div
                className="mt-7 grid animate-fade-up grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center lg:justify-start"
                style={{ animationDelay: "360ms" }}
              >
                <Link
                  href="/signage-quotes"
                  className="group inline-flex animate-glow items-center justify-center gap-2 rounded-xl accent-gradient px-5 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black transition hover:brightness-110 active:scale-[0.98] sm:rounded-md sm:px-6 sm:py-3"
                >
                  Get a Quote
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </Link>
                <Link
                  href="#categories"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl cyan-gradient px-5 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#18d3e8]/30 transition hover:brightness-110 active:scale-[0.98] sm:rounded-md sm:px-6 sm:py-3"
                >
                  <span className="sm:hidden">Shop</span>
                  <span className="hidden sm:inline">Browse Products</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </Link>
                <Link
                  href="/gallery"
                  className="group col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-white/5 px-5 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-foreground transition hover:bg-white/10 active:scale-[0.98] sm:col-span-1 sm:rounded-md sm:px-6 sm:py-3"
                >
                  View Our Gallery
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </Link>
              </div>

              {/* Trust row */}
              <ul
                className="mt-7 flex animate-fade-up flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground-muted sm:text-sm lg:justify-start"
                style={{ animationDelay: "460ms" }}
              >
                <li>
                  <a
                    href="https://yelp.to/v94oy-jn5w"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition hover:text-foreground"
                  >
                    <span className="tracking-tight text-[#d9f000]" aria-hidden>
                      ★★★★★
                    </span>
                    Top-rated on Yelp
                  </a>
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckIcon /> Free design proof
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckIcon /> Locally owned in Stuart
                </li>
              </ul>
            </div>

            {/* Hero image */}
            <div className="relative order-1 mb-16 sm:mb-20 lg:order-2 lg:mb-0">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-4xl bg-linear-to-br from-[#d9f000]/25 via-[#18d3e8]/20 to-[#d94cb3]/25 opacity-70 blur-2xl" />
              <div className="lg:animate-float">
                <div className="group relative overflow-hidden rounded-2xl border border-[#d9f000]/30 shadow-2xl shadow-[#d9f000]/20">
                  <Image
                    src="/Hero.jpeg"
                    alt="Print Laser Stitch — printing, embroidery, vehicle wraps, apparel and engraving samples"
                    width={768}
                    height={512}
                    sizes="(min-width: 1024px) 600px, 100vw"
                    className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
                    priority
                  />
                  {/* Light sweep on hover */}
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                </div>
              </div>
              {/* Anthony waves from the corner of the hero image. Tap him! */}
              <TalkingAnthony
                pose="welcome"
                intro
                align="right"
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 128px"
                className="absolute -bottom-16 right-0 z-10 w-32 sm:-bottom-20 sm:w-44 lg:-bottom-10 lg:-right-6 lg:w-60"
              />
            </div>
          </div>
        </section>

        {/* Services ticker */}
        <section
          aria-label="Our services"
          className="relative overflow-hidden border-y border-border-soft bg-background-soft/70 py-4"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-background to-transparent sm:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-background to-transparent sm:w-32" />
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center"
              >
                {SERVICES_TICKER.map((s, i) => (
                  <li
                    key={s}
                    className="flex items-center gap-6 pr-6 font-display text-sm font-black uppercase tracking-wide text-foreground/80 sm:gap-8 sm:pr-8 sm:text-base"
                  >
                    {s}
                    <span
                      aria-hidden
                      className={
                        i % 3 === 0
                          ? "text-[#d9f000]"
                          : i % 3 === 1
                            ? "text-[#18d3e8]"
                            : "text-[#d94cb3]"
                      }
                    >
                      ✦
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* Custom Sticker Builder — flagship tool with instant proof */}
        <section className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <Link
            href="/products/vinyl-stickers"
            data-reveal
            className="group relative isolate flex min-h-40 flex-row overflow-hidden rounded-2xl bg-[#ffb366] shadow-lg shadow-black/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 sm:min-h-0"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[#ff8c1a]"
              style={{
                clipPath: "polygon(38% 0, 100% 0, 100% 100%, 12% 100%)",
              }}
            />

            <div className="relative z-10 flex max-w-[54%] flex-1 flex-col justify-center gap-2 p-5 sm:max-w-none sm:gap-3 sm:p-10 lg:p-12">
              <span className="hidden w-fit items-center gap-2 rounded-full border border-black/10 bg-white/40 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a3e00] sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8a3e00]" />
                Design it yourself
              </span>
              <h2 className="font-display text-lg font-black uppercase leading-[0.95] tracking-tight text-[#8a3e00] sm:text-4xl">
                Custom Vinyl Stickers
              </h2>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-[#8a4a1a] sm:line-clamp-none sm:max-w-xl sm:text-base">
                Upload your artwork, pick a shape, size and finish, then see
                an instant proof with a die-cut preview — before you ever
                check out.
              </p>
              <ul className="hidden gap-2 text-sm text-[#8a4a1a] sm:grid sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <StickerCheckIcon /> Instant preflight proof
                </li>
                <li className="flex items-center gap-2">
                  <StickerCheckIcon /> Auto die-cut &amp; white border
                </li>
                <li className="flex items-center gap-2">
                  <StickerCheckIcon /> Background remover built in
                </li>
                <li className="flex items-center gap-2">
                  <StickerCheckIcon /> Waterproof premium vinyl
                </li>
              </ul>
              <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full shop-now-gradient px-4 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/25 transition group-hover:brightness-110 sm:mt-4 sm:px-6 sm:py-3 sm:text-sm">
                Start Designing
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  <Arrow />
                </span>
              </span>
            </div>

            <div className="relative z-10 flex-1 self-stretch px-3 py-3 sm:px-6 sm:py-6">
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-black/15 bg-black/10 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <Image
                  src="/vinyl-sticker-logo.png"
                  alt="Custom vinyl stickers"
                  fill
                  sizes="(max-width: 640px) 46vw, 40vw"
                  className="object-cover transition-transform duration-700 group-hover:rotate-1 group-hover:scale-110"
                />
              </div>
            </div>
          </Link>
        </section>

        {/* Make your selection — image-driven product grid */}
        <section
          id="categories"
          className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-12 pt-10 sm:px-6 lg:px-8"
        >
          <div className="mb-8 text-center sm:mb-10" data-reveal>
            <span className="inline-block rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
              Make your selection
            </span>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              What can we{" "}
              <span className="accent-gradient-text">make for you?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground-muted">
              {productCategories.length > 0
                ? `${productCategories.length} categories — pick one to see every product inside.`
                : "Browse our full range of custom print, engraving and apparel products."}
            </p>
          </div>

          {productCategories.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-border-soft bg-surface p-8 text-center">
              <div className="text-3xl">🗂️</div>
              <p className="mt-3 text-sm text-foreground-muted">
                Our catalog is being updated — please check back shortly.
              </p>
            </div>
          ) : (
            <CategoryGrid categories={productCategories} />
          )}
        </section>

        {/* One Shirt, No Minimum */}
        <section className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <Link
            href="/one-shirt"
            data-reveal
            className="flex items-center justify-between gap-4 rounded-3xl border border-[#d9f000]/30 bg-linear-to-r from-[#d9f000]/10 via-surface to-[#18d3e8]/10 p-5 sm:p-8"
          >
            <div>
              <h2 className="font-display text-2xl font-black uppercase sm:text-3xl">One shirt. No minimum.</h2>
              <p className="mt-1 text-sm text-foreground-muted sm:text-base">Black tees and polos from $25. Printed in Stuart. Pickup.</p>
            </div>
            <span className="shrink-0 rounded-xl bg-[#d9f000] px-4 py-2.5 text-sm font-black uppercase text-black">Design it</span>
          </Link>
        </section>

        {/* Vehicle Wrap Designer — design a wrap on the exact truck */}
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-2 sm:px-6 lg:px-8">
          <Link
            href="/wrap-designer"
            data-reveal
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#d94cb3]/30 bg-linear-to-br from-[#d94cb3]/15 via-surface to-[#18d3e8]/10 p-6 sm:p-10 lg:flex-row lg:items-center lg:gap-10"
          >
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#d94cb3]/20 blur-3xl" />
            <div className="relative flex-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d94cb3]/40 bg-[#d94cb3]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d94cb3]">
                New · Free design tool
              </span>
              <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                Design your{" "}
                <span className="bg-linear-to-r from-[#d94cb3] to-[#18d3e8] bg-clip-text text-transparent">
                  vehicle wrap.
                </span>
              </h2>
              <p className="mt-3 max-w-xl text-sm text-foreground-muted sm:text-base">
                Drop your logo, lettering and shapes onto a true-to-scale template of your truck. See every side, work in real inches, then send it to us for a quote.
              </p>
              <ul className="mt-4 grid gap-1.5 text-sm text-foreground/85 sm:grid-cols-2">
                <li>✓ All sides: left, right, front, back and top</li>
                <li>✓ Real sizes in inches (1:20 scale)</li>
                <li>✓ Upload artwork, add text and shapes</li>
                <li>✓ Download a PNG or PDF proof</li>
              </ul>
              <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#d94cb3] to-[#18d3e8] px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d94cb3]/30 transition group-hover:brightness-110 sm:w-auto sm:rounded-md sm:py-3">
                Design your wrap →
              </span>
            </div>
            <div aria-hidden className="relative mt-6 flex items-center justify-center text-[7rem] leading-none sm:text-[9rem] lg:mt-0 lg:w-72">
              🛻
            </div>
          </Link>
        </section>

        {/* Team & business orders — automatic polo volume discounts */}
        <section className="mx-auto max-w-7xl overflow-x-clip px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-surface via-background-soft to-surface p-6 sm:p-12">
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#d9f000]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#d94cb3]/15 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div data-reveal="left">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d9f000]/40 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d9f000]" />
                  Team &amp; business orders
                </span>
                <h2 className="mt-4 font-display text-3xl font-black uppercase leading-[1.02] tracking-tight sm:text-5xl">
                  Outfit your{" "}
                  <span className="accent-gradient-text">whole crew.</span>
                </h2>
                <p className="mt-4 max-w-xl text-base text-foreground-muted">
                  Polos, tees, long sleeves and tanks with your logo for
                  contractors, offices, restaurants and teams. The more you
                  order, the more you save — bulk pricing is applied
                  automatically on every garment.
                </p>
                <ul className="mt-6 space-y-2 text-sm text-foreground/85">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Mix sizes — every piece counts toward your discount
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Free design proof before we stitch
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Made in our Stuart, FL shop
                  </li>
                </ul>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/collections/custom-apparel"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl accent-gradient px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110 active:scale-[0.98] sm:rounded-md sm:py-3"
                  >
                    Shop Custom Apparel
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      <Arrow />
                    </span>
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-white/5 px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-foreground transition hover:bg-white/10 sm:rounded-md sm:py-3"
                  >
                    Request a Bulk Quote
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {TEAM_TIERS.map((t, i) => {
                  const color =
                    t.accent === "yellow"
                      ? "text-[#d9f000]"
                      : t.accent === "cyan"
                        ? "text-[#18d3e8]"
                        : "text-[#d94cb3]";
                  return (
                    <div
                      key={t.qty}
                      data-reveal="scale"
                      style={delay(i * 120)}
                      className={`relative flex flex-col items-center rounded-2xl border bg-background/70 px-2 py-5 text-center backdrop-blur hover:-translate-y-1 sm:px-4 sm:py-8 ${
                        t.featured
                          ? "border-[#d9f000]/50 shadow-xl shadow-[#d9f000]/15"
                          : "border-border-soft"
                      }`}
                    >
                      {t.featured && (
                        <span className="absolute -top-2.5 rounded-full accent-gradient px-2 py-0.5 font-headline text-[9px] font-bold uppercase tracking-wider text-black sm:text-[10px]">
                          Popular
                        </span>
                      )}
                      <span className="font-headline text-[10px] uppercase tracking-[0.18em] text-foreground-muted sm:text-xs">
                        {t.qty} pieces
                      </span>
                      <span
                        className={`mt-2 font-display text-3xl font-black sm:text-5xl ${color}`}
                      >
                        <CountUp to={t.pct} suffix="%" />
                      </span>
                      <span className="mt-1 font-headline text-[10px] font-bold uppercase tracking-wider sm:text-xs">
                        off
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Vehicle Sticker Kits — find decals for your exact vehicle */}
        <section className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <Link
            href="/vehicle-stickers"
            data-reveal
            className="group relative block overflow-hidden rounded-3xl border border-[#18d3e8]/30 bg-linear-to-br from-[#18d3e8]/10 via-surface to-[#d9f000]/10 p-6 hover:border-[#18d3e8]/50 sm:p-12"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#18d3e8]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#d9f000]/15 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#18d3e8]/40 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
                  Vehicle-specific decal kits
                </span>
                <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Custom Vehicle{" "}
                  <span className="bg-linear-to-r from-[#18d3e8] to-[#d9f000] bg-clip-text text-transparent">
                    Sticker Kits
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-base text-foreground-muted">
                  Pick your make, model and year — see decal sets cut perfectly
                  for{" "}
                  <span className="text-foreground">your exact vehicle</span>.
                  Hood sets, bedsides, full kits and more.
                </p>
                <ul className="mt-6 grid grid-cols-2 gap-2 text-sm text-foreground/85">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Hood Set
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Bedside Decals
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Full Vehicle Set
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Back Decals
                  </li>
                </ul>
                <span className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl cyan-gradient px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#18d3e8]/30 transition group-hover:brightness-110 sm:inline-flex sm:w-auto sm:rounded-md sm:py-3">
                  Find Your Vehicle
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </span>
              </div>
              <div className="relative order-1 lg:order-2">
                {/* Matches the source image's native 3:2 ratio so object-cover
                    has no need to crop any of it away. */}
                <div className="relative mx-auto aspect-3/2 w-full max-w-md overflow-hidden rounded-2xl border border-border-soft bg-background/60 shadow-2xl shadow-black/40 backdrop-blur transition-transform duration-500 group-hover:scale-105 lg:max-w-none">
                  <Image
                    src="/car wrap decal.png"
                    alt="Custom vehicle sticker kit example"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 480px, 100vw"
                  />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Instant quote tool — Sign & Decal Builder */}
        <section className="mx-auto max-w-7xl overflow-x-clip px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl border border-[#d9f000]/30 bg-linear-to-br from-[#18d3e8]/10 via-surface to-[#d94cb3]/10 p-6 sm:p-10"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#18d3e8]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#d9f000]/10 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#18d3e8]/40 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
                  Instant pricing
                </span>
                <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Sign &amp; Decal{" "}
                  <span className="accent-gradient-text">Builder</span>
                </h2>
                <p className="mt-3 text-sm text-foreground-muted sm:text-base">
                  Window decals, wall graphics, vehicle lettering and sign
                  panels — pick where it goes, drag it to size, and see it at
                  real scale before you order. Print only, design &amp; print,
                  or full installation.
                </p>
                <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                  <li className="flex items-center gap-2"><CheckIcon /> Real-scale visual preview</li>
                  <li className="flex items-center gap-2"><CheckIcon /> Multiple pieces, one quote</li>
                  <li className="flex items-center gap-2"><CheckIcon /> Old decal &amp; wrap removal</li>
                  <li className="flex items-center gap-2"><CheckIcon /> Free travel in Martin &amp; St. Lucie</li>
                </ul>
                <Link
                  href="/signage-quotes"
                  className="group mt-7 inline-flex items-center justify-center gap-2 rounded-xl accent-gradient px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110 active:scale-[0.98] sm:w-fit sm:rounded-md sm:py-3"
                >
                  Build My Sign
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </Link>
              </div>
              <Link
                href="/signage-quotes"
                aria-label="Open the Sign & Decal Builder"
                className="block overflow-hidden rounded-2xl border border-border-soft bg-[#0e0e11] shadow-2xl shadow-black/40 transition hover:border-[#d9f000]/40"
              >
                <div className="aspect-[16/10] w-full">
                  <Stage
                    interactive={false}
                    piece={{
                      surface: "window",
                      shape: "rounded",
                      material: "printed-vinyl",
                      widthIn: 48,
                      heightIn: 22,
                      offsetX: 0,
                      offsetY: -12,
                      label: "OPEN 9–5",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border-soft px-4 py-2.5 text-xs">
                  <span className="text-foreground-muted">4′ × 1′ 10″ on an 8′ storefront window</span>
                  <span className="font-bold text-[#d9f000]">Try it →</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Print Laser Stitch University — external learning site */}
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <a
            href="https://printlaserstitchuniversity.com/"
            target="_blank"
            rel="noopener noreferrer"
            data-reveal
            className="group relative block overflow-hidden rounded-3xl border border-[#d94cb3]/30 bg-linear-to-br from-[#d94cb3]/10 via-surface to-[#18d3e8]/10 p-6 hover:border-[#d94cb3]/50 sm:p-12"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d94cb3]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#18d3e8]/15 blur-3xl" />
            <div className="relative grid items-center gap-6 sm:gap-8 lg:grid-cols-[1fr_1.4fr]">
              <div className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d94cb3]/40 bg-[#d94cb3]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d94cb3]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d94cb3]" />
                  Learn the craft
                </span>
                <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Print Laser Stitch{" "}
                  <span className="bg-linear-to-r from-[#d94cb3] to-[#18d3e8] bg-clip-text text-transparent">
                    University
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-base text-foreground-muted">
                  Want to sharpen your design and print skills? Step into our
                  learning hub for tutorials, walkthroughs and courses from the
                  Print Laser Stitch team.
                </p>
                <span className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#d94cb3] to-[#18d3e8] px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d94cb3]/30 transition group-hover:brightness-110 sm:inline-flex sm:w-auto sm:rounded-md sm:py-3">
                  Visit the University
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </span>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative mx-auto aspect-square max-w-[13rem] overflow-hidden rounded-2xl border border-border-soft bg-background/60 shadow-2xl shadow-black/40 backdrop-blur transition-transform duration-500 group-hover:rotate-1 group-hover:scale-[1.03] sm:max-w-xs">
                  <Image
                    src="/university-logo.jpeg"
                    alt="Print Laser Stitch University"
                    fill
                    sizes="(max-width: 1024px) 60vw, 360px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </a>
        </section>

        {/* Meet Anthony — a personal touch */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div
            data-reveal
            className="relative overflow-x-clip rounded-3xl border border-[#18d3e8]/25 bg-linear-to-br from-[#18d3e8]/10 via-surface to-[#d9f000]/10 px-5 pt-6 sm:px-10 sm:pt-8"
          >
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#18d3e8]/15 blur-3xl" />
            <div className="relative grid grid-cols-[1fr_auto] items-end gap-3 sm:gap-8">
              <div className="pb-6 sm:pb-10">
                <span className="inline-block rounded-full border border-[#18d3e8]/40 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[10px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8] sm:text-[11px]">
                  Meet your printer
                </span>
                <h2 className="mt-3 font-display text-2xl font-black uppercase leading-tight tracking-tight sm:text-4xl">
                  Questions?{" "}
                  <span className="accent-gradient-text">Just ask Anthony.</span>
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-foreground-muted sm:text-base">
                  Not sure which product, size or file to use? Send a message
                  and we&apos;ll help you pick the right one. Real people, right
                  here in Stuart.
                </p>
                <Link
                  href="/contact"
                  className="accent-gradient mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#d9f000]/20 transition-transform hover:scale-[1.03]"
                >
                  Message Anthony <Arrow size={14} />
                </Link>
              </div>
              <TalkingAnthony
                pose="thumbs"
                align="right"
                className="w-32 sm:w-52 lg:w-64"
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 128px"
              />
            </div>
          </div>
        </section>

        {/* Why order with us — promise band */}
        <section className="border-t border-border-soft bg-background-soft/60">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <PromiseItem
                num="01"
                title="Free design proof"
                text="See your artwork before we ever print it."
                accent="yellow"
                index={0}
              />
              <PromiseItem
                num="02"
                title="Fast turnaround"
                text="Most orders printed within 5–12 business days."
                accent="cyan"
                index={1}
              />
              <PromiseItem
                num="03"
                title="Reprint guarantee"
                text="Not right? We'll redo it — no hassle."
                accent="magenta"
                index={2}
              />
              <PromiseItem
                num="04"
                title="Florida print shop"
                text="Locally run and operated in Martin County, FL."
                accent="yellow"
                index={3}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#d9f000]/20 text-[#d9f000]">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function StickerCheckIcon() {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#8a3e00]/15 text-[#8a3e00]">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}


function PromiseItem({
  num,
  title,
  text,
  accent,
  index,
}: {
  num: string;
  title: string;
  text: string;
  accent: "yellow" | "cyan" | "magenta";
  index: number;
}) {
  const color =
    accent === "yellow"
      ? "text-[#d9f000]"
      : accent === "cyan"
        ? "text-[#18d3e8]"
        : "text-[#d94cb3]";
  return (
    <div
      data-reveal
      style={delay(index * 90)}
      className="flex flex-col gap-2 rounded-2xl border border-border-soft bg-surface p-4 hover:-translate-y-1 hover:border-border-strong sm:p-6"
    >
      <span className={`font-display text-2xl font-black ${color}`}>
        {num}
      </span>
      <div className="font-headline text-xs font-bold uppercase tracking-wider sm:text-sm">
        {title}
      </div>
      <div className="text-xs text-foreground-muted sm:text-sm">{text}</div>
    </div>
  );
}
