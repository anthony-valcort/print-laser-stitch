import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Cart · Print Laser Stitch",
  description: "Review your items and check out.",
};

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CartView />
      </main>
      <Footer />
    </>
  );
}
