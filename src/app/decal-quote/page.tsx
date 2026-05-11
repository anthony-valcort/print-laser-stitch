import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DecalCalculator from "@/components/DecalCalculator";

export const metadata: Metadata = {
  title: "Quick Quote · Print Laser Stitch",
  description:
    "Quick Quote — Manual Entry. Add panels manually by entering dimensions and descriptions, pick your material, and get an instant quote with 7% Martin County tax.",
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
