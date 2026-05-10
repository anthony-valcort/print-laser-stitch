import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import FAQSection from "@/components/FAQSection";
import SignageCalculator from "@/components/SignageCalculator";

export const metadata: Metadata = {
  title: "Custom Signage Calculator · Print Laser Stitch",
  description:
    "Instant pricing for custom banners, yard signs, aluminum, acrylic, and foam board. Standard sizes in seconds, custom dimensions quoted within 24h.",
};

export default function SignageQuotesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <SignageCalculator />
        <TrustBadges />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
