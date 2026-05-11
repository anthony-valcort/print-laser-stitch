import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import DecalCalculator from "@/components/DecalCalculator";

export const metadata: Metadata = {
  title: "Decal Quote Calculator · Print Laser Stitch",
  description:
    "Instant pricing for window film, wall vinyl, and decal jobs. Add multiple panels, pick your material and service plan, and check out.",
};

export default function DecalQuotePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <DecalCalculator />
        <TrustBadges />
      </main>
      <Footer />
    </>
  );
}
