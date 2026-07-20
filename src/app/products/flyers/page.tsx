import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Custom Flyers · Print Laser Stitch",
  description:
    "Full-color flyers in 4×6, 5×7, and 4×5.5 — front-only or double-sided. Bulk pricing from 100 to 1,000.",
};

export const revalidate = 300;

export default function FlyersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="flyers"
          badge="Bulk flyers · 5–12 business days"
          minQuantity={1}
          uploadMode="auto"
          fallbackEmoji="📄"
          howToOrderVideoId="iSvRIeYYNl4"
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
