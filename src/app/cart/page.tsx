import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartView from "@/components/CartView";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Cart · Print Laser Stitch",
  description: "Review your items and check out.",
};

export default async function CartPage() {
  // Login is optional — pass the customer if any so CartView can prefill the
  // email; guests get a plain email input.
  const customer = await getCurrentCustomer();
  return (
    <>
      <Header />
      <main className="flex-1">
        <CartView customerEmail={customer?.email ?? null} />
      </main>
      <Footer />
    </>
  );
}
