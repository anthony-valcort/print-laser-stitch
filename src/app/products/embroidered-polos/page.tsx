import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import FAQSection from "@/components/FAQSection";
import TShirtConfigurator from "@/components/TShirtConfigurator";
import { getProductByHandle } from "@/lib/shopify-products";
import { ShopifyError } from "@/lib/shopify";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Custom Embroidered Polos · Print Laser Stitch",
  description:
    "Premium performance and cotton polos embroidered with your logo or design. Min 6 pieces.",
};

export const revalidate = 300;

const PRODUCT_HANDLE = "custom-embroidered-polo";
const POLO_MIN_QUANTITY = 6;

export default async function EmbroideredPolosPage() {
  let product = null;
  let fetchError: string | null = null;

  try {
    product = await getProductByHandle(PRODUCT_HANDLE);
  } catch (err) {
    fetchError =
      err instanceof ShopifyError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load product";
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {product ? (
          <TShirtConfigurator
            product={product}
            badge={`Embroidered apparel · min ${POLO_MIN_QUANTITY} pcs`}
            minQuantity={POLO_MIN_QUANTITY}
            showPrintLocations={false}
            singleUploadLabel="Embroidery Artwork"
          />
        ) : (
          <ProductMissingNotice handle={PRODUCT_HANDLE} error={fetchError} />
        )}
        <TrustBadges />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}

function ProductMissingNotice({
  handle,
  error,
}: {
  handle: string;
  error: string | null;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <div className="text-3xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-bold">Polo product not loaded</h1>
        <p className="mt-3 text-sm text-foreground-muted">
          We could not load{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            {handle}
          </code>{" "}
          from Shopify.
        </p>
        {error && (
          <p className="mt-3 max-w-xl mx-auto rounded-lg bg-black/30 px-4 py-3 text-left font-mono text-xs text-amber-200">
            {error}
          </p>
        )}
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
