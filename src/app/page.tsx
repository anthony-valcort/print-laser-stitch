import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { categories } from "@/lib/categories";

export default function Home() {
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

        {/* Categories */}
        <section id="categories" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Shop by category
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">
                {categories.length} services — every category links to its own
                product page.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={c.href}
                className="group relative overflow-hidden rounded-2xl border border-border-soft bg-surface p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-elevated"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition group-hover:opacity-30 accent-gradient" />
                <div className="relative">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-2xl">
                    {c.emoji}
                  </div>
                  <div className="mt-5 text-lg font-semibold">{c.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-accent">
                    {c.tagline}
                  </div>
                  <p className="mt-3 text-sm text-foreground-muted">
                    {c.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground/90 group-hover:text-foreground">
                    Configure
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition group-hover:translate-x-0.5"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
