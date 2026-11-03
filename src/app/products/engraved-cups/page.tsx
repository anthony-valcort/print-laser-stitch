import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import ProductPageShell from "@/components/ProductPageShell";

export const metadata: Metadata = {
  title: "Laser Engraved Tumblers in Stuart, FL | Print Laser Stitch",
  description:
    "Send us your tumblers or cups and we'll laser-engrave your logo or design. Tiered pricing for 1 to 85 cups, from our Stuart, Florida shop.",
  alternates: { canonical: "/products/engraved-cups" },
};

export const revalidate = 300;

export default function EngravedCupsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductPageShell
          handle="custom-lea-engraving-customer-providing-cups-tumblr"
          badge="You ship the cups · we engrave"
          minQuantity={1}
          uploadMode="single"
          uploadLabel="Engraving Artwork"
          fallbackEmoji="🥤"
          notice={
            <>
              <strong>How this works:</strong> You provide the cups or
              tumblers — ship them to our shop after placing the order, and
              we&apos;ll laser-engrave your design and ship them back. We&apos;ll
              email shipping instructions once your order is placed.
            </>
          }
        />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
