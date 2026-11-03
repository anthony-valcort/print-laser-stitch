import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Laser Engraved Wallets in Stuart, FL | Print Laser Stitch",
  description:
    "Personalized leather wallets laser-engraved with initials, logos or artwork. Great gifts for groomsmen, clients and employees. Stuart, Florida.",
  alternates: { canonical: "/products/engraved-wallets" },
};

export const revalidate = 300;

export default function EngravedWalletsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="laser-engraving-custom-wallet"
          badge="Laser engraved · personalized"
          minQuantity={1}
          uploadMode="single"
          uploadLabel="Engraving Artwork"
          fallbackEmoji="👛"
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
