import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Custom Flyer, Brochure & Postcard Printing in Stuart, FL | Print Laser Stitch",
  description:
    "Full-color flyers, brochures and postcards in 12 sizes from 4×4 to 13×19, single or double-sided at the same price. 100 to 10,000 pieces with instant online pricing, printed for Stuart, Florida businesses.",
  alternates: { canonical: "/products/flyers" },
};

// Tier-card pricing (size / sides / quantity) is auto-detected from the
// product's Shopify options — see PrintTierPicker.
export const revalidate = 300;

export default function FlyersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="flyers"
          badge="100–10,000 pcs · 5–12 business days"
          minQuantity={1}
          uploadMode="auto"
          fallbackEmoji="📄"
          howToOrderVideoId="iSvRIeYYNl4"
          requiresTemplateFit
          tieredPrintPricing
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
