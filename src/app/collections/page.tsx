import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryGrid from "@/components/CategoryGrid";
import { getAllCollections } from "@/lib/shopify-collections";

export const metadata: Metadata = {
  title: "Shop by Category · Print Laser Stitch",
  description:
    "Browse every product category — stickers, apparel, signs, vehicle graphics, laser engraving and more.",
};

export const revalidate = 300;

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
            <CategoryGrid categories={collections} />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
