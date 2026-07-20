import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TemplateFitPageClient from "@/components/template-fit/TemplateFitPageClient";

export const metadata: Metadata = {
  title: "Fit Your Design · Print Laser Stitch",
  description: "Position your artwork inside the print bleed and safe lines.",
};

export default function TemplateFitPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <TemplateFitPageClient />
      </main>
      <Footer />
    </>
  );
}
