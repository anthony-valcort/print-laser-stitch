import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      </main>
      <Footer />
    </>
  );
}
