import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllCollections } from "@/lib/shopify-collections";

export const metadata: Metadata = {
  title: "Shop by Category · Print Laser Stitch",
  description:
    "Browse every product category — stickers, apparel, signs, vehicle graphics, laser engraving and more.",
};

export const revalidate = 300;

/** Cycles the three brand neons so the grid stays on-brand without monotony. */
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

export default async function CollectionsPage() {
  let collections: Awaited<ReturnType<typeof getAllCollections>> = [];
  let loadError = false;

  try {
    collections = await getAllCollections();
  } catch {
    loadError = true;
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <span className="inline-block rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
              Shop by category
            </span>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              What can we{" "}
              <span className="accent-gradient-text">make for you?</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground-muted">
              {collections.length > 0
                ? `${collections.length} categories — pick one to see every product inside.`
                : "Browse our full range of custom print, engraving and apparel products."}
            </p>
          </div>

          {loadError || collections.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
              <div className="text-3xl">🗂️</div>
              <p className="mt-3 text-sm text-foreground-muted">
                Categories are being updated. Please check back shortly, or{" "}
                <Link href="/" className="text-[#18d3e8] hover:underline">
                  return home
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((c, i) => {
                const accent = ACCENTS[i % ACCENTS.length];
                return (
                  <Link
                    key={c.id}
                    href={`/collections/${c.handle}`}
                    className={`group relative overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-[#d9f000]/40 hover:${accent.glow}`}
                  >
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
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="text-6xl drop-shadow-2xl">🗂️</span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute -inset-full bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100" />
                    </div>

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
