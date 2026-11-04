import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageCopy from "@/components/PageCopy";
import DecalCalculator from "@/components/DecalCalculator";

export const metadata: Metadata = {
  title: "Custom Decal & Signage Quote | Print Laser Stitch, Stuart FL",
  description:
    "Enter your panel sizes, pick a material, and get an instant decal and signage quote from our Stuart, Florida shop, including Martin County tax.",
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
            "Enter the size of each panel, pick a material and quantity, and the calculator prices your job on the spot, including Martin County sales tax. It is built for the jobs shops get asked about most: storefront and window lettering, wall graphics, vehicle lettering, and panel signs.",
            "If your project is unusual, such as curved surfaces, large installs or a rush deadline, call (772) 985-2854 or send a message and we will confirm the price and timing.",
          ]}
          points={[
            { title: "Several panels, one quote", text: "Add as many panel sizes as the job needs and see the combined total." },
            { title: "Material choice", text: "Compare materials side by side so you pay for what the sign actually needs." },
            { title: "Installation available", text: "Tell us the install location and deadline and we will quote it with the job." },
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
