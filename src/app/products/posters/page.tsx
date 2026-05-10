import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Custom Posters & Photo Printing · Print Laser Stitch",
  description:
    "High-resolution poster and photo printing in standard and oversize formats. Upload your design — printed in 24–48 hours.",
};

export const revalidate = 300;

export default function PostersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="posters"
          badge="Custom posters · printed in 24–48h"
          minQuantity={1}
          uploadMode="single"
          uploadLabel="Poster Design"
          fallbackEmoji="🖼️"
        />
        <TrustBadges />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
