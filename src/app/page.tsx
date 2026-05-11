import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { categories } from "@/lib/categories";

const HERO_GRADIENTS: Record<string, string> = {
  "vinyl-stickers": "from-pink-500 via-fuchsia-500 to-purple-600",
  tshirts: "from-sky-500 via-cyan-500 to-blue-600",
  "business-cards": "from-amber-400 via-orange-500 to-red-500",
  flyers: "from-emerald-400 via-teal-500 to-cyan-600",
  posters: "from-violet-500 via-purple-500 to-indigo-600",
  brochures: "from-rose-400 via-pink-500 to-fuchsia-600",
  banners: "from-yellow-400 via-amber-500 to-orange-500",
  "car-magnets": "from-slate-500 via-zinc-600 to-stone-700",
  "embroidery-patches": "from-red-500 via-rose-500 to-pink-600",
  "embroidered-polos": "from-emerald-500 via-green-600 to-teal-700",
  "engraved-cups": "from-orange-400 via-red-500 to-rose-600",
  "engraved-wallets": "from-amber-700 via-yellow-700 to-orange-800",
  "engraved-bottle-openers": "from-zinc-400 via-slate-500 to-gray-600",
  "custom-canvas": "from-purple-400 via-violet-500 to-indigo-600",
  "signage-quotes": "from-cyan-400 via-blue-500 to-indigo-600",
};

export default function Home() {
  const productCategories = categories.filter(
    (c) => c.slug !== "signage-quotes",
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 left-1/2 z-0 h-120 w-225 -translate-x-1/2 rounded-full opacity-30 blur-3xl accent-gradient" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8 lg:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-4 py-1 text-xs font-medium text-foreground-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Free online proofs · Printed in 24–48 hours
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Custom prints, apparel & engraving for{" "}
              <span className="accent-gradient-text">your brand</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-foreground-muted sm:text-lg">
              From vinyl stickers to embroidered polos and laser-engraved
              wallets — pick a category and we&apos;ll print, stitch, or etch
              it for you.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/products/vinyl-stickers"
                className="rounded-full accent-gradient px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-strong/30 hover:opacity-95"
              >
                Start an order
              </Link>
              <a
                href="#categories"
                className="rounded-full border border-border-strong bg-white/5 px-6 py-3 text-sm font-semibold text-foreground hover:bg-white/10"
              >
                Browse products
              </a>
            </div>
          </div>
        </section>

        {/* Make your selection — image-driven product grid */}
        <section
          id="categories"
          className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
        >
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-accent">
              Make your selection
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              What can we{" "}
              <span className="accent-gradient-text">make for you?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground-muted">
              {productCategories.length} services — every category links to its
              own configurator. Click a card to start your order.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {productCategories.map((c) => {
              const gradient =
                HERO_GRADIENTS[c.slug] ?? "from-accent to-accent-strong";
              return (
                <Link
                  key={c.slug}
                  href={c.href}
                  className="group relative overflow-hidden rounded-3xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent-strong/10"
                >
                  {/* Hero image area — large gradient with emoji centerpiece */}
                  <div
                    className={`relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br ${gradient}`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="text-7xl drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 sm:text-8xl">
                        {c.emoji}
                      </span>
                    </div>
                    {/* shimmer overlay on hover */}
                    <div className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100" />
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold leading-tight">
                          {c.name}
                        </div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-accent">
                          {c.tagline}
                        </div>
                      </div>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-foreground/70 transition group-hover:bg-accent group-hover:text-white">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-transform group-hover:translate-x-0.5"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-foreground-muted">
                      {c.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Quick Quote (multi-panel + material) CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-indigo-500/15 p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  Window film · Wall vinyl
                </span>
                <h3 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Quick Quote{" "}
                  <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
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
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:opacity-95"
                  >
                    Open Quick Quote
                    <svg
                      width="16"
                      height="16"
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
                  </Link>
                </div>
              </div>

              {/* Sample quote */}
              <div className="relative">
                <div className="mx-auto max-w-sm rounded-2xl border border-border-soft bg-background/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-foreground-muted">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
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
                      <span className="font-bold text-cyan-300">$17.12</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Decal Signage Calculator (service plan) CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-emerald-500/15 via-lime-500/10 to-yellow-500/15 p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Print &amp; install quote generator
                </span>
                <h3 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Decal Signage{" "}
                  <span className="bg-gradient-to-r from-emerald-300 to-yellow-400 bg-clip-text text-transparent">
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
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 hover:opacity-95"
                  >
                    Open Calculator
                    <svg
                      width="16"
                      height="16"
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
                  </Link>
                </div>
              </div>

              {/* Sample quote */}
              <div className="relative">
                <div className="mx-auto max-w-sm rounded-2xl border border-border-soft bg-background/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-foreground-muted">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
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
                      <span className="font-bold text-emerald-300">$30.60</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-t border-border-soft bg-background-soft/40">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            <TrustItem
              icon="🚚"
              title="Free shipping"
              text="On all U.S. orders over $75"
            />
            <TrustItem
              icon="✏️"
              title="Free proofs"
              text="Approve before we print"
            />
            <TrustItem
              icon="⚡"
              title="24–48 hr turnaround"
              text="Same-day for stickers"
            />
            <TrustItem
              icon="🎯"
              title="Satisfaction guarantee"
              text="Reprint or full refund"
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CheckIcon() {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-400/20 text-cyan-300">
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
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/5 text-2xl">
        {icon}
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-foreground-muted">{text}</div>
      </div>
    </div>
  );
}
