import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignageCalculator from "@/components/SignageCalculator";

export const metadata: Metadata = {
  title: "Decal Signage Calculator · Print Laser Stitch",
  description:
    "Print & installation quote generator. Enter dimensions, pick a service plan, and get an instant quote.",
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
