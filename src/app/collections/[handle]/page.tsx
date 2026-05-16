import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCollectionByHandle } from "@/lib/shopify-collections";
import { ShopifyError } from "@/lib/shopify";

export const revalidate = 300;

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
      title: `${collection.title} · Print Laser Stitch`,
      description:
        collection.description.replace(/<[^>]+>/g, "").slice(0, 160) ||
        `Browse ${collection.title} at Print Laser Stitch.`,
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

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              {collection.title}
            </h1>
            {description && (
              <p className="mt-3 max-w-2xl text-sm text-foreground-muted">
                {description}
              </p>
            )}
            <p className="mt-2 font-headline text-[11px] uppercase tracking-[0.2em] text-[#d9f000]">
              {collection.products.length}{" "}
              {collection.products.length === 1 ? "product" : "products"}
            </p>
          </div>

          {collection.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-soft bg-white/3 px-6 py-16 text-center text-sm text-foreground-muted">
              No products in this category yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {collection.products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.handle}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-[#d9f000]/40 hover:shadow-[0_0_40px_rgba(217,240,0,0.18)]"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-white/5">
                    {p.featuredImage?.url ? (
                      <Image
                        src={p.featuredImage.url}
                        alt={p.featuredImage.altText ?? p.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-5xl">📦</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="font-headline text-sm font-semibold leading-snug">
                      {p.title}
                    </div>
                    <div className="mt-auto pt-3">
                      {p.minPrice ? (
                        <span className="font-headline text-sm font-bold text-[#18d3e8]">
                          From ${Number(p.minPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-headline text-xs uppercase tracking-wider text-foreground-muted">
                          View options
                        </span>
                      )}
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
