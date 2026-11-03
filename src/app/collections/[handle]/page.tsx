import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fadeDelay, revealDelay } from "@/lib/reveal";
import { GARMENT_VOLUME_TIERS, hasVolumePricing } from "@/lib/volume-discounts";
import { getCollectionByHandle } from "@/lib/shopify-collections";
import { ShopifyError } from "@/lib/shopify";

export const revalidate = 300;

// Client-provided "How to Order" walkthrough videos, keyed by Shopify
// collection handle — shown in the header slot next to the description.
const COLLECTION_HOW_TO_ORDER_VIDEO_IDS: Record<string, string> = {
  "business-printing": "iSvRIeYYNl4",
  "custom-apparel": "jlGjde0g60k",
};

// Client-provided reference image shown in the same header slot, for
// collections that have one instead of a how-to-order video.
const COLLECTION_HEADER_IMAGES: Record<string, string> = {
  "vehicle-boat-graphics": "/car%20sticker.jpg",
};

type Params = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  try {
    const collection = await getCollectionByHandle(handle);
    if (!collection)
      return { title: "Category not found · Print Laser Stitch" };
    return {
      title: `${/^custom\b/i.test(collection.title) ? "" : "Custom "}${collection.title} | Print Laser Stitch, Stuart FL`,
      description:
        collection.description.replace(/<[^>]+>/g, "").slice(0, 160) ||
        `Shop ${collection.title.toLowerCase()} from Print Laser Stitch in Stuart, Florida — instant online pricing and bulk discounts.`,
      alternates: { canonical: `/collections/${collection.handle}` },
    };
  } catch {
    return { title: "Category · Print Laser Stitch" };
  }
}

export default async function CollectionPage({
  params,
}: {
  params: Params;
}) {
  const { handle } = await params;

  let collection = null;
  let fetchError: string | null = null;

  try {
    collection = await getCollectionByHandle(handle);
  } catch (err) {
    fetchError =
      err instanceof ShopifyError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load category";
  }

  if (fetchError) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
              <div className="text-3xl">⚠️</div>
              <h1 className="mt-4 text-2xl font-bold">Category not loaded</h1>
              <p className="mt-3 text-sm text-foreground-muted">
                We could not load this category from Shopify.
              </p>
              <Link
                href="/collections"
                className="mt-6 inline-flex rounded-full border border-border-strong bg-white/5 px-5 py-2 text-sm font-medium hover:bg-white/10"
              >
                ← All categories
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (!collection) notFound();

  const description = collection.description
    .replace(/<[^>]+>/g, "")
    .trim();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border-soft bg-background-soft/60">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 text-xs sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-foreground-muted hover:text-foreground"
            >
              Home
            </Link>
            <span className="text-foreground-muted/40">/</span>
            <Link
              href="/collections"
              className="text-foreground-muted hover:text-foreground"
            >
              Categories
            </Link>
            <span className="text-foreground-muted/40">/</span>
            <span className="font-medium">{collection.title}</span>
          </div>
        </div>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mb-8 flex flex-col gap-6 sm:mb-10 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="animate-fade-up">
              <h1
                className={`font-display font-black uppercase tracking-tight ${
                  COLLECTION_HEADER_IMAGES[collection.handle]
                    ? "text-[2.1rem] leading-[1.05] sm:text-5xl"
                    : "text-3xl sm:text-4xl"
                }`}
              >
                {collection.title}
              </h1>
              {description && (
                <p
                  className={`mt-3 max-w-2xl text-foreground-muted ${
                    COLLECTION_HEADER_IMAGES[collection.handle]
                      ? "text-base"
                      : "text-sm"
                  }`}
                >
                  {description}
                </p>
              )}
              <p className="mt-2 font-headline text-[11px] uppercase tracking-[0.2em] text-[#d9f000]">
                {collection.products.length}{" "}
                {collection.products.length === 1 ? "product" : "products"}
              </p>
            </div>

            {COLLECTION_HEADER_IMAGES[collection.handle] ? (
              <div
                className="mx-auto w-full max-w-60 shrink-0 animate-fade-up sm:mx-0 sm:w-64 sm:max-w-none lg:w-72"
                style={fadeDelay(150)}
              >
                <Image
                  src={COLLECTION_HEADER_IMAGES[collection.handle]}
                  alt={`${collection.title} pricing reference`}
                  width={2304}
                  height={3456}
                  className="h-auto w-full rounded-2xl border border-border-soft shadow-lg shadow-black/30"
                />
              </div>
            ) : (
              COLLECTION_HOW_TO_ORDER_VIDEO_IDS[collection.handle] && (
                <div
                  className="w-full shrink-0 animate-fade-up lg:w-105"
                  style={fadeDelay(150)}
                >
                  <h2 className="font-display text-2xl font-black uppercase tracking-tight text-[#d9f000] sm:text-3xl">
                    How to Order
                  </h2>
                  <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-border-soft shadow-lg shadow-black/30">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${COLLECTION_HOW_TO_ORDER_VIDEO_IDS[collection.handle]}`}
                      title="How to order — Print Laser Stitch"
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )
            )}
          </div>

          {collection.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-soft bg-white/3 px-6 py-16 text-center text-sm text-foreground-muted">
              No products in this category yet. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {collection.products.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/products/${p.handle}`}
                  data-reveal="scale"
                  style={revealDelay((i % 4) * 80)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface hover:-translate-y-1 hover:border-[#d9f000]/40 hover:shadow-[0_0_40px_rgba(217,240,0,0.18)]"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-white/5">
                    {hasVolumePricing(p.title) && (
                      <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full accent-gradient px-2 py-1 font-headline text-[9px] font-black uppercase tracking-wide text-black shadow-lg shadow-black/30 sm:text-[10px]">
                        <span aria-hidden>🏷️</span>
                        Up to {Math.max(...GARMENT_VOLUME_TIERS.map((t) => t.percent))}% off bulk
                      </span>
                    )}
                    {p.featuredImage?.url ? (
                      <Image
                        src={p.featuredImage.url}
                        alt={p.featuredImage.altText ?? p.title}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-5xl">📦</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <div className="line-clamp-3 font-headline text-[13px] font-semibold leading-snug sm:line-clamp-none sm:text-sm">
                      {p.title}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2 sm:pt-3">
                      {p.minPrice ? (
                        <span className="font-headline text-sm font-bold text-[#18d3e8]">
                          From ${Number(p.minPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-headline text-xs uppercase tracking-wider text-foreground-muted">
                          View options
                        </span>
                      )}
                      <span
                        aria-hidden
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-foreground-muted transition group-hover:translate-x-0.5 group-hover:bg-[#d9f000] group-hover:text-black"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
