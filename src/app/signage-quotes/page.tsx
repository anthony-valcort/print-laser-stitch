import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageCopy from "@/components/PageCopy";
import SignageCalculator from "@/components/SignageCalculator";

export const metadata: Metadata = {
  title: "Sign & Decal Pricing Calculator | Print Laser Stitch, Stuart FL",
  description:
    "Instant quotes for printed signs and decals: print only, design and print, or full installation around Stuart and the Treasure Coast.",
  alternates: { canonical: "/signage-quotes" },
};

export default function SignageQuotesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <SignageCalculator />
        <PageCopy
          heading="Custom signs and decals in Stuart, FL"
          paragraphs={[
            "Print Laser Stitch makes custom signs, window and wall decals, and printed graphics for businesses and homeowners in Stuart and across the Treasure Coast. Use the calculator above for an instant price, then send your request and we will follow up to confirm the details.",
            "Choose the level of help you need: print only if you already have artwork, design and print if you want us to create or clean up the artwork, or full installation if you would rather not do it yourself. The calculator shows your price up front, so there are no surprises when you order.",
          ]}
          points={[
            { title: "Print only", text: "Send finished artwork and we print it to your size on the material you choose." },
            { title: "Design and print", text: "Need artwork created or cleaned up? Our graphic design service can handle it before printing." },
            { title: "Full installation", text: "We print and install around Stuart, Jensen Beach, Palm City, Hobe Sound and nearby." },
            { title: "Local shop", text: "Everything is produced at our shop at 3153 SE Dominica Terrace, Stuart, FL." },
          ]}
          links={[
            { href: "/decal-quote", label: "Decal quote by panel size" },
            { href: "/vehicle-stickers", label: "Vehicle decal kits" },
            { href: "/products/banners", label: "Vinyl banners" },
            { href: "/contact", label: "Talk to us" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
