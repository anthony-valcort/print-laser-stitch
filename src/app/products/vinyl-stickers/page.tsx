import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductConfigurator from "@/components/ProductConfigurator";
import FAQSection from "@/components/FAQSection";
import ReturnPolicyNote from "@/components/ReturnPolicyNote";
import AlreadyCustomerCTA from "@/components/AlreadyCustomerCTA";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Custom Vinyl Stickers in Stuart, FL | Print Laser Stitch",
  description:
    "Waterproof, UV-protected custom vinyl stickers, die-cut or kiss-cut, from a Stuart, Florida print shop. Instant online pricing; 5–12 business days.",
  alternates: { canonical: "/products/vinyl-stickers" },
};

export default function VinylStickersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Product",
              name: "Custom Vinyl Stickers",
              description:
                "Waterproof, UV-protected custom vinyl stickers, die-cut or kiss-cut, printed in Stuart, Florida.",
              image: `${SITE_URL}/og-image.png`,
              brand: { "@type": "Brand", name: "Print Laser Stitch" },
              url: `${SITE_URL}/products/vinyl-stickers`,
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "USD",
                lowPrice: "70.00",
                availability: "https://schema.org/InStock",
                seller: { "@type": "Organization", name: "Print Laser Stitch" },
              },
            },
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Products", path: "/collections" },
              { name: "Custom Vinyl Stickers", path: "/products/vinyl-stickers" },
            ]),
          ]}
        />
        <ProductConfigurator />
        <ReturnPolicyNote />
        <FAQSection />
        <AlreadyCustomerCTA />
      </main>
      <Footer />
    </>
  );
}
