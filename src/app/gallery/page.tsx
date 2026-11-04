import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      </main>
      <Footer />
    </>
  );
}
