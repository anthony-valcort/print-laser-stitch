import type { MetadataRoute } from "next";
import { SITE_URL, productPath } from "@/lib/seo";
import { getAllActiveProducts } from "@/lib/shopify-products";
import { getAllCollections } from "@/lib/shopify-collections";
import { getBlogArticles } from "@/lib/shopify-blog";
import { getBuiltTogether, storyPath } from "@/lib/built-together";

export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/products/embroidered-polos", priority: 0.9 },
  { path: "/products/tshirts", priority: 0.9 },
  { path: "/products/vinyl-stickers", priority: 0.9 },
  { path: "/products/banners", priority: 0.8 },
  { path: "/products/business-cards", priority: 0.8 },
  { path: "/products/flyers", priority: 0.8 },
  { path: "/products/posters", priority: 0.8 },
  { path: "/products/engraved-cups", priority: 0.8 },
  { path: "/products/engraved-wallets", priority: 0.8 },
  { path: "/products/engraved-bottle-openers", priority: 0.8 },
  { path: "/signage-quotes", priority: 0.8 },
  { path: "/decal-quote", priority: 0.7 },
  { path: "/vehicle-stickers", priority: 0.7 },
  { path: "/wrap-designer", priority: 0.8 },
  { path: "/one-shirt", priority: 0.8 },
  { path: "/collections", priority: 0.7 },
  { path: "/gallery", priority: 0.6 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.7 },
  { path: "/blog", priority: 0.6 },
  { path: "/built-together", priority: 0.7 },
  { path: "/privacy", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, priority: number, lastModified: Date = now) => {
    if (!entries.has(path)) {
      entries.set(path, { url: `${SITE_URL}${path}`, lastModified, priority });
    }
  };

  for (const p of STATIC_PAGES) add(p.path, p.priority);

  // Every active Shopify product (new products appear automatically).
  try {
    for (const product of await getAllActiveProducts()) {
      add(productPath(product.handle), 0.7);
    }
  } catch {}

  try {
    const bt = await getBuiltTogether(false);
    for (const y of bt.years) add(`/built-together/${y.year}`, 0.5);
    for (const m of bt.milestones) add(storyPath(m), 0.6, new Date(m.date));
  } catch {}

  try {
    for (const c of await getAllCollections()) add(`/collections/${c.handle}`, 0.6);
  } catch {}

  try {
    for (const a of await getBlogArticles(100)) {
      const published = new Date(a.publishedAt);
      add(`/blog/${a.handle}`, 0.5, Number.isNaN(published.getTime()) ? now : published);
    }
  } catch {}

  return [...entries.values()];
}
