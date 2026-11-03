import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";
import { getTemplateFitOverrides } from "@/lib/product-template-fit-overrides";

export const metadata: Metadata = {
  title: "Business Card Printing in Stuart, FL | Print Laser Stitch",
  description:
    "Premium 3.5×2″ 15pt business cards, matte or glossy, printed in Stuart, Florida. Bulk pricing from 250 to 5,000 cards with instant online ordering.",
  alternates: { canonical: "/products/business-cards" },
};

export const revalidate = 300;

const HANDLE = "2x3-5-standard-business-cards";

export default function BusinessCardsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle={HANDLE}
          badge="15pt premium cards"
          minQuantity={1}
          uploadMode="front-back"
          fallbackEmoji="💳"
          {...getTemplateFitOverrides(HANDLE)}
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
