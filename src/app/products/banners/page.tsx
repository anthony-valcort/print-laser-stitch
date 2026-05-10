import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Custom Banners · Print Laser Stitch",
  description:
    "Heavy-duty 13oz and 16oz PVC vinyl banners in landscape sizes from 2×1 up to 8×4. Grommets, pole pockets, and lamination available.",
};

export const revalidate = 300;

export default function BannersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="custom-banners"
          badge="Indoor & outdoor banners"
          minQuantity={1}
          uploadMode="auto"
          uploadLabel="Banner Design"
          fallbackEmoji="🚩"
        />
        <TrustBadges />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
