/**
 * Snapshot of the Team Hub (Base44) Pricing Catalog: the items that fit the
 * portal (one price per piece, optional sizes). Bundles, per-sq-ft and manual
 * quotes are left out, since they don't price by "each".
 * Snapshot date: 2026-11-20.
 */
export type PriceListItem = {
  name: string;
  category: string;
  price: number;
  minQty: number;
  sizes?: string[];
  upcharge?: Record<string, number>;
};

const S6 = ["S", "M", "L", "XL", "2XL", "3XL"];
const UP6 = { "2XL": 2, "3XL": 3 };

export const PRICE_LIST: PriceListItem[] = [
  { name: "T-Shirt (Cotton or Poly)", category: "Shirts", price: 13.99, minQty: 12, sizes: S6, upcharge: UP6 },
  { name: "Super Soft 50/50 T-Shirt", category: "Shirts", price: 18.99, minQty: 12, sizes: S6, upcharge: UP6 },
  { name: "Next Level 3600 Cotton T-Shirt", category: "Shirts", price: 18.9, minQty: 12, sizes: S6, upcharge: UP6 },
  { name: "Bella + Canvas 3001C T-Shirt", category: "Shirts", price: 20.83, minQty: 12, sizes: S6, upcharge: UP6 },
  { name: "Comfort Colors CC1717 T-Shirt", category: "Shirts", price: 19.98, minQty: 12, sizes: S6, upcharge: UP6 },
  { name: "Women's Zone Performance T-Shirt", category: "Shirts", price: 16.99, minQty: 12, sizes: S6, upcharge: UP6 },
  { name: "Unisex DRI-POWER Sport T-Shirt", category: "Shirts", price: 13.5, minQty: 1, sizes: S6, upcharge: UP6 },
  { name: "Long Sleeve Performance Tee", category: "Shirts", price: 16.25, minQty: 1, sizes: S6, upcharge: UP6 },
  {
    name: "Women's Tank Top",
    category: "Shirts",
    price: 18.99,
    minQty: 12,
    sizes: [...S6, "4XL"],
    upcharge: { "2XL": 3.78, "3XL": 6.2, "4XL": 6.01 },
  },
  { name: "Embroidered Performance Polo", category: "Polos", price: 29.99, minQty: 6, sizes: S6, upcharge: UP6 },
  { name: "Women's Polo Embroidery", category: "Polos", price: 29.99, minQty: 1, sizes: S6, upcharge: UP6 },
  { name: "Embroidery Only (your own polo)", category: "Polos", price: 14.99, minQty: 6 },
  { name: "Printed Hat (Richardson 112FP)", category: "Hats", price: 26.99, minQty: 1 },
  { name: "5 Panel Rope Hat", category: "Hats", price: 37.99, minQty: 1 },
  { name: "Reflective Safety Vest", category: "Safety", price: 40, minQty: 1 },
  { name: "Car Magnet 24x18", category: "Vehicle", price: 49.5, minQty: 1 },
  { name: "Roll-Up Banner (white stand)", category: "Banners", price: 220, minQty: 1 },
  { name: "Tabletop Display 11.5x17.5", category: "Banners", price: 56, minQty: 1 },
  { name: "Laser Engraved Tumbler", category: "Engraving", price: 28, minQty: 1 },
  { name: "Laser Engraved Wallet", category: "Engraving", price: 40, minQty: 1 },
  { name: "4x6 Photo Print", category: "Prints", price: 10, minQty: 1 },
  { name: "8x10 Photo Print", category: "Prints", price: 6, minQty: 1 },
];
