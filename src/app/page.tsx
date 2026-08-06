import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryGrid from "@/components/CategoryGrid";
import { getAllCollections } from "@/lib/shopify-collections";

export const revalidate = 300;

const WRAP_SERVICES = [
  {
    icon: "🚗",
    title: "Full Vehicle Wraps",
    desc: "Complete color-change wraps using premium 3M & Avery cast vinyl. Matte, gloss, satin or chrome finishes.",
    accent: "yellow" as const,
    href: "/collections",
  },
  {
    icon: "🎨",
    title: "Partial Wraps & Decals",
    desc: "Hood wraps, roof wraps, door graphics and custom accent decals — stand out without a full wrap.",
    accent: "cyan" as const,
    href: "/collections",
  },
  {
    icon: "🛡️",
    title: "Paint Protection Film",
    desc: "Invisible PPF shields your paint from rock chips, scratches and UV fade. Self-healing gloss or matte finish.",
    accent: "magenta" as const,
    href: "/collections",
  },
  {
    icon: "🪟",
    title: "Window Tinting",
    desc: "Ceramic and carbon window film for heat rejection, UV blocking and privacy — with a clean OEM look.",
    accent: "yellow" as const,
    href: "/collections",
  },
  {
    icon: "🚚",
    title: "Fleet & Commercial Graphics",
    desc: "Brand your entire fleet with consistent, professional vehicle graphics that turn every drive into an ad.",
    accent: "cyan" as const,
    href: "/collections",
  },
  {
    icon: "✨",
    title: "Color Change Wraps",
    desc: "Forged carbon, camo, brushed metal and custom-printed designs — transform your ride inside a day.",
    accent: "magenta" as const,
    href: "/collections",
  },
];

export default async function Home() {
  let productCategories: Awaited<ReturnType<typeof getAllCollections>> = [];
  const result = await getAllCollections().catch(() => []);
  productCategories = result;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* HERO — split layout: text left, Hero.jpeg right */}
        <section className="relative overflow-x-clip isolate">
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:pt-24">
            {/* Left — copy */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
                We print · We engrave · We stitch
              </span>

              <h1 className="glitch-text mx-auto mt-5 max-w-2xl font-display text-4xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:mx-0 lg:text-6xl">
                Bringing your{" "}
                <span className="accent-gradient-text">vision</span>
                <br className="hidden sm:inline" />{" "}
                to life.
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base text-foreground-muted sm:text-lg lg:mx-0">
                Premium custom printing, laser engraving and stitching — built
                for businesses, creators and car enthusiasts. From vinyl
                stickers to embroidered polos, we print, stitch or etch it for
                you.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  href="/decal-quote"
                  className="inline-flex items-center gap-2 rounded-md accent-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110"
                >
                  Get a Quote
                  <Arrow />
                </Link>
                <Link
                  href="#categories"
                  className="inline-flex items-center gap-2 rounded-md cyan-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#18d3e8]/30 transition hover:brightness-110"
                >
                  Browse Products
                  <Arrow />
                </Link>
                <Link
                  href="/gallery"
                  className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-white/5 px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-foreground transition hover:bg-white/10"
                >
                  View Our Gallery
                  <Arrow />
                </Link>
              </div>
            </div>

            {/* Right — Hero image */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-4xl bg-linear-to-br from-[#d9f000]/20 via-[#18d3e8]/20 to-[#d94cb3]/20 opacity-60 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-[#d9f000]/30 shadow-2xl shadow-[#d9f000]/20">
                <Image
                  src="/Hero.jpeg"
                  alt="Print Laser Stitch — printing, embroidery, vehicle wraps, apparel and engraving samples"
                  width={768}
                  height={512}
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Custom Sticker Builder — flagship tool with instant proof */}
        <section className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <Link
            href="/products/vinyl-stickers"
            className="group relative isolate flex min-h-40 flex-row overflow-hidden rounded-2xl bg-[#ffb366] shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 sm:min-h-0"
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
                <Arrow />
              </span>
            </div>

            <div className="relative z-10 flex-1 self-stretch px-3 py-3 sm:px-6 sm:py-6">
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-black/15 bg-black/10 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <Image
                  src="/vinyl-sticker-logo.png"
                  alt="Custom vinyl stickers"
                  fill
                  sizes="(max-width: 640px) 46vw, 40vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </Link>
        </section>



        {/* Make your selection — image-driven product grid */}
        <section
          id="categories"
          className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8"
        >
          <div className="mb-10 text-center">
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

        {/* Vehicle Sticker Kits — find decals for your exact vehicle */}
        <section className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <Link
            href="/vehicle-stickers"
            className="group relative block overflow-hidden rounded-3xl border border-[#18d3e8]/30 bg-linear-to-br from-[#18d3e8]/10 via-surface to-[#d9f000]/10 p-8 transition hover:border-[#18d3e8]/50 sm:p-12"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#18d3e8]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#d9f000]/15 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
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
                <ul className="mt-6 grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
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
                <span className="mt-8 inline-flex items-center gap-2 rounded-md cyan-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#18d3e8]/30 transition group-hover:brightness-110">
                  Find Your Vehicle
                  <Arrow />
                </span>
              </div>
              <div className="relative">
                {/* Matches the source image's native 3:2 ratio so object-cover
                    has no need to crop any of it away. */}
                <div className="relative mx-auto aspect-3/2 w-full max-w-sm overflow-hidden rounded-2xl border border-border-soft bg-background/60 shadow-2xl shadow-black/40 backdrop-blur transition group-hover:scale-105 lg:max-w-none">
                  <Image
                    src="/car wrap decal.png"
                    alt="Custom vehicle sticker kit example"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 480px, 400px"
                  />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Quick Quote (multi-panel + material) CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#18d3e8]/30 bg-linear-to-br from-[#18d3e8]/10 via-surface to-[#18d3e8]/5 p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#18d3e8]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#18d3e8]/10 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#18d3e8]/40 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
                  Window film · Wall vinyl
                </span>
                <h3 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Quick Quote{" "}
                  <span className="bg-linear-to-r from-[#18d3e8] to-[#d9f000] bg-clip-text text-transparent">
                    Calculator
                  </span>
                </h3>
                <p className="mt-4 text-base text-foreground-muted">
                  Add panels for doors, windows, walls, wood, or metal — pick
                  a vinyl material and get instant pricing with 7% Martin
                  County tax included.
                </p>

                <ul className="mt-6 space-y-2 text-sm text-foreground/85">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Add multiple panels in one quote
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> 5 vinyl materials + special order
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Discount + 7% tax handled automatically
                  </li>
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/decal-quote"
                    className="inline-flex items-center gap-2 rounded-md cyan-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#18d3e8]/30 transition hover:brightness-110"
                  >
                    Open Quick Quote
                    <Arrow />
                  </Link>
                </div>
              </div>

              {/* Sample quote */}
              <div className="relative">
                <div className="mx-auto max-w-sm rounded-2xl border border-border-soft bg-background/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
                  <div className="mb-3 flex items-center gap-2 font-headline text-xs uppercase tracking-[0.2em] text-foreground-muted">
                    <span className="h-2 w-2 rounded-full bg-[#d9f000]" />
                    Sample Quote
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <CalcRow label="🚪 Door" value="12″ × 12″" />
                    <CalcRow label="Material" value="Full Vinyl" />
                    <CalcRow label="Subtotal" value="$16.00" />
                    <CalcRow label="Tax (7%)" value="$1.12" />
                    <div className="my-3 border-t border-border-soft" />
                    <div className="flex items-center justify-between text-base">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-[#18d3e8]">$17.12</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Decal Signage Calculator (service plan) CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#d9f000]/30 bg-linear-to-br from-[#d9f000]/10 via-surface to-[#d94cb3]/10 p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d9f000]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#d94cb3]/15 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d9f000]/40 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d9f000]" />
                  Print &amp; install quote generator
                </span>
                <h3 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Decal Signage{" "}
                  <span className="bg-linear-to-r from-[#d9f000] to-[#d94cb3] bg-clip-text text-transparent">
                    Calculator
                  </span>
                </h3>
                <p className="mt-4 text-base text-foreground-muted">
                  Enter width and length, pick a service tier (Print Only,
                  Design &amp; Print, or Full Install), and get an instant
                  quote.
                </p>

                <ul className="mt-6 space-y-2 text-sm text-foreground/85">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Toggle between feet and inches
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> 3 service tiers: $10 / $12 / $18 per sq ft
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Custom discount support
                  </li>
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/signage-quotes"
                    className="inline-flex items-center gap-2 rounded-md accent-gradient px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110"
                  >
                    Open Calculator
                    <Arrow />
                  </Link>
                </div>
              </div>

              {/* Sample quote */}
              <div className="relative">
                <div className="mx-auto max-w-sm rounded-2xl border border-border-soft bg-background/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
                  <div className="mb-3 flex items-center gap-2 font-headline text-xs uppercase tracking-[0.2em] text-foreground-muted">
                    <span className="h-2 w-2 rounded-full bg-[#d9f000]" />
                    Sample Quote
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <CalcRow label="Width × Length" value="1′ × 1.7′" />
                    <CalcRow label="Service" value="Full Install" />
                    <CalcRow label="Rate" value="$18.00 / sq ft" />
                    <CalcRow label="Quantity" value="1" />
                    <div className="my-3 border-t border-border-soft" />
                    <div className="flex items-center justify-between text-base">
                      <span className="font-semibold">Grand Total</span>
                      <span className="font-bold text-[#d9f000]">$30.60</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Print Laser Stitch University — external learning site */}
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <a
            href="https://printlaserstitchuniversity.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-3xl border border-[#d94cb3]/30 bg-linear-to-br from-[#d94cb3]/10 via-surface to-[#18d3e8]/10 p-8 transition hover:border-[#d94cb3]/50 sm:p-12"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d94cb3]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#18d3e8]/15 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
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
                <span className="mt-8 inline-flex items-center gap-2 rounded-md bg-linear-to-r from-[#d94cb3] to-[#18d3e8] px-6 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d94cb3]/30 transition group-hover:brightness-110">
                  Visit the University
                  <Arrow />
                </span>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative mx-auto aspect-square max-w-xs overflow-hidden rounded-2xl border border-border-soft bg-background/60 shadow-2xl shadow-black/40 backdrop-blur transition group-hover:scale-[1.02]">
                  <Image
                    src="/university-logo.jpeg"
                    alt="Print Laser Stitch University"
                    fill
                    sizes="(max-width: 1024px) 80vw, 360px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </a>
        </section>

        {/* Why order with us — promise band */}
        <section className="border-t border-border-soft bg-background-soft/60">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid divide-y divide-border-soft overflow-hidden rounded-2xl border border-border-soft bg-surface sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              <PromiseItem
                num="01"
                title="Free design proof"
                text="See your artwork before we ever print it."
                accent="yellow"
              />
              <PromiseItem
                num="02"
                title="Fast turnaround"
                text="Most orders printed within 5–12 business days."
                accent="cyan"
              />
              <PromiseItem
                num="03"
                title="Reprint guarantee"
                text="Not right? We'll redo it — no hassle."
                accent="magenta"
              />
              <PromiseItem
                num="04"
                title="Florida print shop"
                text="Locally run and operated in Martin County, FL."
                accent="yellow"
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

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PromiseItem({
  num,
  title,
  text,
  accent,
}: {
  num: string;
  title: string;
  text: string;
  accent: "yellow" | "cyan" | "magenta";
}) {
  const color =
    accent === "yellow"
      ? "text-[#d9f000]"
      : accent === "cyan"
        ? "text-[#18d3e8]"
        : "text-[#d94cb3]";
  return (
    <div className="flex flex-col gap-2 p-6">
      <span className={`font-display text-2xl font-black ${color}`}>
        {num}
      </span>
      <div className="font-headline text-sm font-bold uppercase tracking-wider">
        {title}
      </div>
      <div className="text-sm text-foreground-muted">{text}</div>
    </div>
  );
}
