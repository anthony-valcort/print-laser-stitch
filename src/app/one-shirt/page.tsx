import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OneShirt from "./OneShirt";

export const metadata: Metadata = {
  title: "One Shirt, No Minimum | Print Laser Stitch",
  description:
    "Order just one custom printed shirt in Stuart, Florida. Black T-shirts and polos, printed front and back, local pickup. No minimum.",
};

export default function OneShirtPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <OneShirt />
      </main>
      <Footer />
    </>
  );
}
