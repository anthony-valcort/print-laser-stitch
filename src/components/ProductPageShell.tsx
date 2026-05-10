import Link from "next/link";
import { getProductByHandle } from "@/lib/shopify-products";
import { ShopifyError } from "@/lib/shopify";
import GenericProductConfigurator, {
  type GenericProductConfiguratorProps,
} from "@/components/GenericProductConfigurator";

type ProductPageShellProps = {
  /** Shopify product handle (cotton-banners, posters, etc.). */
  handle: string;
} & Omit<GenericProductConfiguratorProps, "product">;

/**
 * Server-side shell that fetches the Shopify product by handle and renders
 * the generic configurator. Falls back to a friendly notice if the fetch
 * fails (missing scope, wrong handle, sold out, etc.).
 */
export default async function ProductPageShell({
  handle,
  ...configProps
}: ProductPageShellProps) {
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

  if (!product) {
    return <ProductMissingNotice handle={handle} error={fetchError} />;
  }

  return <GenericProductConfigurator product={product} {...configProps} />;
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
        <h1 className="mt-4 text-2xl font-bold">Product not loaded</h1>
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
        <ul className="mx-auto mt-6 max-w-md space-y-1.5 text-left text-sm text-foreground-muted">
          <li>• Confirm the product handle in Shopify admin matches.</li>
          <li>
            • Confirm the Custom App has{" "}
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
