import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";
import { getTemplateFitOverrides } from "@/lib/product-template-fit-overrides";

export const metadata: Metadata = {
  title: "Custom Vinyl Banners in Stuart, FL | Print Laser Stitch",
  description:
    "Heavy-duty 13oz and 16oz vinyl banners from 2×1 to 8×4 ft with grommets, pole pockets and lamination. Printed in Stuart, Florida.",
  alternates: { canonical: "/products/banners" },
};

export const revalidate = 300;

const HANDLE = "custom-banners";

export default function BannersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle={HANDLE}
          badge="Indoor & outdoor banners"
          minQuantity={1}
          uploadMode="auto"
          uploadLabel="Banner Design"
          fallbackEmoji="🚩"
          {...getTemplateFitOverrides(HANDLE)}
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
