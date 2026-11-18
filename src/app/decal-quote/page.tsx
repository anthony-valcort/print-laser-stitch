import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageCopy from "@/components/PageCopy";
import DecalCalculator from "@/components/DecalCalculator";

export const metadata: Metadata = {
  title: "Custom Decal & Signage Quote | Print Laser Stitch, Stuart FL",
  description:
    "Upload your logo, set the size, pick vinyl, banner, frosted or canvas, and get an instant decal and signage quote from our Stuart, Florida shop, including Martin County tax.",
  alternates: { canonical: "/decal-quote" },
};

export default function DecalQuotePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <DecalCalculator />
        <PageCopy
          heading="How decal and signage quotes work"
          paragraphs={[
            "Upload your logo, set the size and pick a material. The calculator shows your sign and prices it on the spot, including Martin County sales tax. Vinyl banners go up to 5 ft wide. You can save a job and come back to it later.",
            "If your project is unusual, such as curved surfaces, large installs or a rush deadline, call (772) 985-2854 or send a message and we will confirm the price and timing.",
          ]}
          points={[
            { title: "Many logos, one quote", text: "Each logo gets its own size and material. See them all in one preview and one total." },
            { title: "Material choice", text: "Compare materials side by side so you pay for what the sign actually needs." },
            { title: "Installation available", text: "Pick a preferred install date if you like. Weather and our schedule can change it." },
            { title: "Local shop", text: "Print Laser Stitch is in Stuart, FL, serving Martin and St. Lucie counties." },
          ]}
          links={[
            { href: "/signage-quotes", label: "Sign and decal pricing calculator" },
            { href: "/vehicle-stickers", label: "Vehicle decal kits" },
            { href: "/gallery", label: "See our work" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
