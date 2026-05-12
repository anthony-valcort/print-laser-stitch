import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import GenericProductConfigurator from "@/components/GenericProductConfigurator";
import TShirtConfigurator from "@/components/TShirtConfigurator";
import {
  detectMinQuantityFromTitle,
  getProductByHandle,
} from "@/lib/shopify-products";
import { ShopifyError } from "@/lib/shopify";
import { isSizeOption } from "@/components/configurator/colors";

/**
 * Dynamic catch-all product page. Any Shopify product handle Anthony adds in
 * his store automatically becomes available at /products/{handle} — no code
 * change required.
 *
 * The page auto-picks the right configurator:
 *   - If the title says "Min N" / "Minimum N purchase" AND the product has a
 *     "Size" option → bulk-apparel configurator (size matrix, qty per size).
 *   - Otherwise → generic single-variant configurator (variant pickers + qty
 *     stepper + design upload).
 *
 * Static product routes (vinyl-stickers, tshirts, embroidered-polos, etc.)
 * take priority and stay unaffected.
 */

export const revalidate = 300;

type Params = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  try {
    const product = await getProductByHandle(handle);
    if (!product) return { title: "Product not found · Print Laser Stitch" };
    return {
      title: `${product.title} · Print Laser Stitch`,
      description: product.descriptionHtml
        .replace(/<[^>]+>/g, "")
        .slice(0, 160),
    };
  } catch {
    return { title: "Product · Print Laser Stitch" };
  }
}

export default async function DynamicProductPage({
  params,
}: {
  params: Params;
}) {
  const { handle } = await params;

  let product = null;
  let fetchError: string | null = null;

  try {
    product = await getProductByHandle(handle);
  } catch (err) {
    fetchError =
      err instanceof ShopifyError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load product";
  }

  if (fetchError) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <ProductFetchErrorNotice handle={handle} error={fetchError} />
        </main>
        <Footer />
      </>
    );
  }

  if (!product) notFound();

  // Auto-detect bulk-apparel: title encodes a min qty AND product has a Size
  // option. Switch to the size-matrix configurator (TShirtConfigurator) so
  // customers fill in qty per size and total ≥ detected min.
  const detectedMinQty = detectMinQuantityFromTitle(product.title);
  const hasSizeOption = product.options.some((o) => isSizeOption(o.name));
  const useSizeMatrix = !!detectedMinQty && hasSizeOption;

  return (
    <>
      <Header />
      <main className="flex-1">
        {useSizeMatrix ? (
          <TShirtConfigurator
            product={product}
            badge={`Bulk apparel · min ${detectedMinQty} pcs`}
            minQuantity={detectedMinQty}
            showPrintLocations={false}
            singleUploadLabel="Design Artwork"
          />
        ) : (
          <GenericProductConfigurator product={product} />
        )}
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}

function ProductFetchErrorNotice({
  handle,
  error,
}: {
  handle: string;
  error: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <div className="text-3xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-bold">Product not loaded</h1>
        <p className="mt-3 text-sm text-foreground-muted">
          We could not load{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            {handle}
          </code>{" "}
          from Shopify.
        </p>
        <p className="mt-3 max-w-xl mx-auto rounded-lg bg-black/30 px-4 py-3 text-left font-mono text-xs text-amber-200">
          {error}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-border-strong bg-white/5 px-5 py-2 text-sm font-medium hover:bg-white/10"
        >
          ← Back to home
        </Link>
      </div>
    </section>
  );
}
