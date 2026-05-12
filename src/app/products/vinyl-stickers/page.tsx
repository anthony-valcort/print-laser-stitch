import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductConfigurator from "@/components/ProductConfigurator";
import FAQSection from "@/components/FAQSection";
import AlreadyCustomerCTA from "@/components/AlreadyCustomerCTA";

export const metadata: Metadata = {
  title: "Custom Vinyl Stickers · Print Laser Stitch",
  description:
    "Premium custom vinyl stickers — waterproof, UV-protected, printed in 24–48 hours. Build your order with our live pricing calculator.",
};

export default function VinylStickersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductConfigurator />
        <FAQSection />
        <AlreadyCustomerCTA />
      </main>
      <Footer />
    </>
  );
}
