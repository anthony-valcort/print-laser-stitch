import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Standard Business Cards · Print Laser Stitch",
  description:
    "2×3.5″ 15pt premium business cards, matte or glossy finish. Bulk pricing from 250 to 5,000 cards.",
};

export const revalidate = 300;

export default function BusinessCardsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="2x3-5-standard-business-cards"
          badge="15pt premium cards"
          minQuantity={1}
          uploadMode="front-back"
          fallbackEmoji="💳"
        />
        <TrustBadges />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
