import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Poster & Photo Printing in Stuart, FL | Print Laser Stitch",
  description:
    "High-resolution poster and photo printing in standard and oversize formats from our Stuart, Florida shop. Upload your file; 5–12 business days.",
  alternates: { canonical: "/products/posters" },
};

export const revalidate = 300;

export default function PostersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="posters"
          badge="Custom posters · 5–12 business days"
          minQuantity={1}
          uploadMode="single"
          uploadLabel="Poster Design"
          fallbackEmoji="🖼️"
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
