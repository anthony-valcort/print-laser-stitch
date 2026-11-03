import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DecalCalculator from "@/components/DecalCalculator";

export const metadata: Metadata = {
  title: "Custom Decal & Signage Quote | Print Laser Stitch, Stuart FL",
  description:
    "Enter your panel sizes, pick a material, and get an instant decal and signage quote from our Stuart, Florida shop, including Martin County tax.",
  alternates: { canonical: "/decal-quote" },
};

export default function DecalQuotePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <DecalCalculator />
      </main>
      <Footer />
    </>
  );
}
