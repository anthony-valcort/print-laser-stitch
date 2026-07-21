/**
 * Portfolio gallery items — stored as a Shop metafield in Shopify, same
 * pattern as vehicle-shopify.ts.
 * Namespace: "pls_gallery"
 * Key: "items" (json)
 *
 * Required scopes: read_metafields, write_metafields
 */

import { shopifyAdminFetch } from "./shopify";

const NS = "pls_gallery";
const KEY = "items";

export type GalleryMediaType = "image" | "video";

export type GalleryItem = {
  id: string;
  mediaUrl: string;
  mediaType: GalleryMediaType;
  /** Shopify collection handle, or "custom-vinyl-sticker" for the one
   * hardcoded category that isn't a real collection. */
  mainCategoryHandle: string;
  mainCategoryLabel: string;
  /** A product title from within the selected collection — shown to
   * customers as the item's caption. Optional (the hardcoded category has
   * no real products to pick from). */
  subCategory: string | null;
  createdAt: string;
};

// ─── Shop GID (cached per process) ───────────────────────────────────────────
let _shopId: string | null = null;
async function getShopId(): Promise<string> {
  if (_shopId) return _shopId;
  const d = await shopifyAdminFetch<{ shop: { id: string } }>(`query { shop { id } }`);
  _shopId = d.shop.id;
  return _shopId;
}

async function readMetafield(): Promise<string | null> {
  const d = await shopifyAdminFetch<{
    shop: { metafield: { value: string } | null };
  }>(
    `query GetGalleryMeta($ns: String!, $key: String!) {
      shop { metafield(namespace: $ns, key: $key) { value } }
    }`,
    { ns: NS, key: KEY },
  );
  return d.shop.metafield?.value ?? null;
}

async function writeMetafield(value: string): Promise<void> {
  const ownerId = await getShopId();
  const d = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: { field: string; message: string }[] };
  }>(
    `mutation GalleryMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    { metafields: [{ ownerId, namespace: NS, key: KEY, type: "json", value }] },
  );
  const errs = d.metafieldsSet.userErrors;
  if (errs.length) throw new Error(errs[0].message);
}

export async function getAllGalleryItems(): Promise<GalleryItem[]> {
  try {
    const raw = await readMetafield();
    if (!raw) return [];
    const list = JSON.parse(raw) as GalleryItem[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveGalleryItems(list: GalleryItem[]): Promise<void> {
  await writeMetafield(JSON.stringify(list));
}

export async function createGalleryItem(
  item: Omit<GalleryItem, "id" | "createdAt">,
): Promise<GalleryItem> {
  const list = await getAllGalleryItems();
  const created: GalleryItem = {
    ...item,
    id: `gal${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await saveGalleryItems([created, ...list]);
  return created;
}

export async function updateGalleryItem(
  id: string,
  patch: Omit<GalleryItem, "id" | "createdAt">,
): Promise<GalleryItem> {
  const list = await getAllGalleryItems();
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error(`Gallery item ${id} not found`);
  const updated: GalleryItem = { ...patch, id, createdAt: list[idx].createdAt };
  list[idx] = updated;
  await saveGalleryItems(list);
  return updated;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const list = await getAllGalleryItems();
  await saveGalleryItems(list.filter((g) => g.id !== id));
}
