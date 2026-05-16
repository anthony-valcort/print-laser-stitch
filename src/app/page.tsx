import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllCollections } from "@/lib/shopify-collections";

export const revalidate = 300;

/**
 * Cycles through the three brand neons so the category grid stays on-brand
 * without monotony. Yellow = primary, Cyan = secondary, Magenta = tertiary.
 */
const ACCENTS = [
  {
    gradient: "from-[#d9f000] to-[#b8cc00]",
    glow: "shadow-[0_0_40px_rgba(217,240,0,0.25)]",
    text: "text-[#d9f000]",
  },
  {
    gradient: "from-[#18d3e8] to-[#14b8ce]",
    glow: "shadow-[0_0_40px_rgba(24,211,232,0.25)]",
    text: "text-[#18d3e8]",
  },
  {
    gradient: "from-[#d94cb3] to-[#b83a96]",
    glow: "shadow-[0_0_40px_rgba(217,76,179,0.25)]",
    text: "text-[#d94cb3]",
  },
];

export default async function Home() {
  let productCategories: Awaited<ReturnType<typeof getAllCollections>> = [];
  try {
    productCategories = await getAllCollections();
  } catch {
    productCategories = [];
  }

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
                  href="/products/vinyl-stickers"
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
              </div>
            </div>

            {/* Right — Hero image */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-linear-to-br from-[#d9f000]/20 via-[#18d3e8]/20 to-[#d94cb3]/20 opacity-60 blur-2xl" />
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

        {/* Make your selection — image-driven product grid */}
        <section
          id="categories"
          className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {productCategories.map((c, i) => {
                const accent = ACCENTS[i % ACCENTS.length];
                return (
                  <Link
                    key={c.id}
                    href={`/collections/${c.handle}`}
                    className={`group relative overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-[#d9f000]/40 hover:${accent.glow}`}
                  >
                    {/* Hero image area — Shopify collection image */}
                    <div
                      className={`relative aspect-[4/3] w-full overflow-hidden bg-linear-to-br ${accent.gradient}`}
                    >
                      {c.image?.url ? (
                        <Image
                          src={c.image.url}
                          alt={c.image.altText ?? c.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
                          <div className="absolute inset-0 grid place-items-center">
                            <span className="text-7xl drop-shadow-2xl sm:text-8xl">
                              🗂️
                            </span>
                          </div>
                        </>
                      )}
                      {/* shimmer overlay on hover */}
                      <div className="pointer-events-none absolute -inset-full bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100" />
                    </div>

                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-headline text-lg font-semibold leading-tight">
                            {c.title}
                          </div>
                          <div
                            className={`mt-0.5 font-headline text-[11px] uppercase tracking-[0.2em] ${accent.text}`}
                          >
                            {c.productsCount}{" "}
                            {c.productsCount === 1 ? "product" : "products"}
                          </div>
                        </div>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-foreground/70 transition group-hover:bg-[#d9f000] group-hover:text-black">
                          <Arrow size={14} />
                        </span>
                      </div>
                      {c.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-foreground-muted">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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

        {/* Trust strip */}
        <section className="border-t border-border-soft bg-background-soft/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            <TrustItem
              icon="🚚"
              title="Free shipping"
              text="On all U.S. orders over $75"
              accent="yellow"
            />
            <TrustItem
              icon="✏️"
              title="Free proofs"
              text="Approve before we print"
              accent="cyan"
            />
            <TrustItem
              icon="⚡"
              title="24–48 hr turnaround"
              text="Same-day for stickers"
              accent="magenta"
            />
            <TrustItem
              icon="🎯"
              title="Satisfaction guarantee"
              text="Reprint or full refund"
              accent="yellow"
            />
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

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TrustItem({
  icon,
  title,
  text,
  accent,
}: {
  icon: string;
  title: string;
  text: string;
  accent: "yellow" | "cyan" | "magenta";
}) {
  const tint =
    accent === "yellow"
      ? "bg-[#d9f000]/10 text-[#d9f000]"
      : accent === "cyan"
        ? "bg-[#18d3e8]/10 text-[#18d3e8]"
        : "bg-[#d94cb3]/10 text-[#d94cb3]";
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${tint}`}
      >
        {icon}
      </span>
      <div>
        <div className="font-headline font-semibold uppercase tracking-wider">
          {title}
        </div>
        <div className="mt-0.5 text-sm text-foreground-muted">{text}</div>
      </div>
    </div>
  );
}
