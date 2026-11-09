import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductJsonLd from "@/components/ProductJsonLd";
import ReturnPolicyNote from "@/components/ReturnPolicyNote";
import CupConfigurator from "@/components/CupConfigurator";
import { getProductByHandle } from "@/lib/shopify-products";

export const metadata: Metadata = {
  title: "Custom Engraved & UV Tumblers, Stuart FL | Print Laser Stitch",
  description:
    "Custom 20oz insulated tumblers with your logo. Laser engraved or full-color UV. Live preview, from $28. Made in Stuart, Florida.",
  alternates: { canonical: "/products/engraved-cups" },
};

export const revalidate = 300;

export default async function EngravedCupsPage() {
  const product = await getProductByHandle(
    "custom-lea-engraving-customer-providing-cups-tumblr",
  ).catch(() => null);

  return (
    <>
      <Header />
      <main className="flex-1">
        {product ? (
          <>
            <ProductJsonLd product={product} />
            <CupConfigurator product={product} />
            <ReturnPolicyNote />
          </>
        ) : (
          <section className="mx-auto max-w-xl px-4 py-20 text-center">
            <h1 className="text-2xl font-bold">Tumblers are loading</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Please refresh in a moment.
            </p>
          </section>
        )}
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
