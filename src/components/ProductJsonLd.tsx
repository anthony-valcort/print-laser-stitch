import JsonLd from "@/components/JsonLd";
import type { ShopifyProduct } from "@/lib/shopify-products";
import { breadcrumbJsonLd, productJsonLd, productPath } from "@/lib/seo";

/** Product + breadcrumb structured data for a product page. */
export default function ProductJsonLd({ product }: { product: ShopifyProduct }) {
  const path = productPath(product.handle);
  return (
    <JsonLd
      data={[
        productJsonLd(product, path),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Products", path: "/collections" },
          { name: product.title, path },
        ]),
      ]}
    />
  );
}
