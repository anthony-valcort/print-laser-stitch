import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import TShirtConfigurator from "@/components/TShirtConfigurator";
import { getProductByHandle } from "@/lib/shopify-products";
import { ShopifyError } from "@/lib/shopify";

export const metadata: Metadata = {
  title: "Custom T-Shirts · Print Laser Stitch",
  description:
    "Soft-touch DTG and screen-printed cotton tees in every color and size. Upload your design — 5–12 business days.",
};

// Page is statically rendered and refreshed in the background every 5 minutes.
// Anthony updates the product in Shopify → frontend follows after revalidate.
export const revalidate = 300;

const PRODUCT_HANDLE = "cotton-t-shirts";

export default async function TShirtsPage() {
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
          <TShirtConfigurator product={product} />
        ) : (
          <ProductMissingNotice handle={PRODUCT_HANDLE} error={fetchError} />
        )}
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
        <h1 className="mt-4 text-2xl font-bold">T-Shirt product not loaded</h1>
        <p className="mt-3 text-sm text-foreground-muted">
          We could not load the{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            {handle}
          </code>{" "}
          product from Shopify.
        </p>
        {error && (
          <p className="mt-3 max-w-xl mx-auto rounded-lg bg-black/30 px-4 py-3 text-left font-mono text-xs text-amber-200">
            {error}
          </p>
        )}
        <ul className="mx-auto mt-6 max-w-md space-y-1.5 text-left text-sm text-foreground-muted">
          <li>• Confirm the product handle in Shopify admin matches.</li>
          <li>
            • Confirm the Custom App has the{" "}
            <code className="rounded bg-white/10 px-1 text-xs">
              read_products
            </code>{" "}
            scope and the token has been refreshed.
          </li>
          <li>
            • Check that <code className="text-xs">SHOPIFY_STORE_DOMAIN</code>{" "}
            and <code className="text-xs">SHOPIFY_ADMIN_TOKEN</code> are set.
          </li>
        </ul>
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
