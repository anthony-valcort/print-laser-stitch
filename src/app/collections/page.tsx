import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryGrid from "@/components/CategoryGrid";
import { fadeDelay } from "@/lib/reveal";
import { getAllCollections } from "@/lib/shopify-collections";

export const metadata: Metadata = {
  title: "Shop Custom Printing, Apparel & Engraving | Print Laser Stitch",
  description:
    "Browse custom stickers, apparel, embroidery, signs, vehicle graphics and laser engraving from Print Laser Stitch in Stuart, Florida.",
  alternates: { canonical: "/collections" },
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
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <span className="inline-block animate-fade-up rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
              Shop by category
            </span>
            <h1
              className="mt-3 animate-fade-up font-display text-3xl font-black uppercase tracking-tight sm:text-4xl"
              style={fadeDelay(100)}
            >
              What can we{" "}
              <span className="accent-gradient-text">make for you?</span>
            </h1>
            <p
              className="mx-auto mt-3 max-w-2xl animate-fade-up text-sm text-foreground-muted"
              style={fadeDelay(180)}
            >
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
