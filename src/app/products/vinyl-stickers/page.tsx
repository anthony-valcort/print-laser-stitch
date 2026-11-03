import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductConfigurator from "@/components/ProductConfigurator";
import FAQSection from "@/components/FAQSection";
import AlreadyCustomerCTA from "@/components/AlreadyCustomerCTA";

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
        <ProductConfigurator />
        <FAQSection />
        <AlreadyCustomerCTA />
      </main>
      <Footer />
    </>
  );
}
