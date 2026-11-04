import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageCopy from "@/components/PageCopy";
import { getAllGalleryItems } from "@/lib/gallery-shopify";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";

export const metadata: Metadata = {
  title: "Our Work: Embroidery & Printing | Print Laser Stitch",
  description:
    "Real projects from our Stuart, Florida shop — embroidered apparel, custom t-shirts, decals, signs, stickers and laser engraving.",
  alternates: { canonical: "/gallery" },
};

export const revalidate = 60;

export default async function GalleryPage() {
  const items = await getAllGalleryItems();

  return (
    <>
      <Header />
      <main className="flex-1">
        <GalleryPageClient items={items} />
        <PageCopy
          heading="Custom printing, embroidery and engraving made in Stuart, FL"
          paragraphs={[
            "These are real jobs from our shop: embroidered polos and hats for local teams and businesses, screen printed and heat pressed t-shirts, decals and signs, stickers, banners, and laser engraved gifts. Everything is produced at 3153 SE Dominica Terrace in Stuart.",
            "Want something similar? Start with the product page for instant online pricing, or tell us about your project and we will quote it. Orders of 12 or more garments qualify for bulk pricing, and you can mix styles to reach the minimum.",
          ]}
          links={[
            { href: "/products/embroidered-polos", label: "Embroidered polos" },
            { href: "/products/tshirts", label: "Custom t-shirts" },
            { href: "/signage-quotes", label: "Signs and decals" },
            { href: "/contact", label: "Request a quote" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
