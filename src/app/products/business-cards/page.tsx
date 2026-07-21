import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";
import { getTemplateFitOverrides } from "@/lib/product-template-fit-overrides";

export const metadata: Metadata = {
  title: "Standard Business Cards · Print Laser Stitch",
  description:
    "2×3.5″ 15pt premium business cards, matte or glossy finish. Bulk pricing from 250 to 5,000 cards.",
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
