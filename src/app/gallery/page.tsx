import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllGalleryItems } from "@/lib/gallery-shopify";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";

export const metadata: Metadata = {
  title: "Gallery · Print Laser Stitch",
  description: "A showcase of our custom print, decal, and engraving projects.",
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
