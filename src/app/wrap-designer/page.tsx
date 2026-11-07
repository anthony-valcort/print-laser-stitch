import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WrapDesigner from "./WrapDesigner";

export const metadata: Metadata = {
  title: "Design Your Vehicle Wrap | Print Laser Stitch",
  description:
    "Design your vehicle wrap online: upload artwork, add text and shapes in real inches on a 1:20 template of your truck, then request a quote from Print Laser Stitch in Stuart, Florida.",
};

export default function WrapDesignerPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <WrapDesigner />
      </main>
      <Footer />
    </>
  );
}
