import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WrapDesigner from "./WrapDesigner";

export const metadata: Metadata = {
  title: "Vehicle Wrap Designer | Print Laser Stitch",
  description:
    "Preview logos, lettering and colors on your vehicle, then request a wrap quote from Print Laser Stitch in Stuart, Florida.",
  robots: { index: false, follow: false },
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
