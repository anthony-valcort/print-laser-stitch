import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Engraved Bottle Openers in Stuart, FL | Print Laser Stitch",
  description:
    "Stainless steel speed bottle openers laser-engraved with your design. Perfect for bars, weddings and corporate gifts. Made in Stuart, Florida.",
  alternates: { canonical: "/products/engraved-bottle-openers" },
};

export const revalidate = 300;

export default function EngravedBottleOpenersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="custom-engraved-speed-bottle-opener-stainless-steel"
          badge="Stainless steel · laser engraved"
          minQuantity={1}
          uploadMode="single"
          uploadLabel="Engraving Artwork"
          fallbackEmoji="🍾"
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
