export type PartKey = "hoodSet" | "bedside" | "fullSet" | "top";

export const PART_LABELS: Record<PartKey, string> = {
  hoodSet: "Hood Set",
  bedside: "Bedside",
  fullSet: "Full Set",
  top: "Top",
};

export const PART_ICONS: Record<PartKey, string> = {
  hoodSet: "🚘",
  bedside: "🛻",
  fullSet: "✨",
  top: "⬆️",
};

export const ALL_PARTS: PartKey[] = ["hoodSet", "bedside", "fullSet", "top"];

export type StickerPart = {
  price: number;
  /** Primary image URL (first of imageUrls, kept for back-compat). */
  imageUrl?: string;
  /** All images for this set — shown in the gallery modal. */
  imageUrls?: string[];
  shopifyVariantId?: string;
};

export type VehicleSticker = {
  id: string;
  make: string;
  model: string;
  years: number[];
  imageUrl?: string;
  parts: Partial<Record<PartKey, StickerPart>>;
};

function yr(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const SEED_VEHICLES: VehicleSticker[] = [
  {
    id: "v1",
    make: "Toyota",
    model: "Tacoma",
    years: yr(2016, 2024),
    parts: {
      hoodSet: { price: 89.99 },
      bedside: { price: 149.99 },
      fullSet: { price: 299.99 },
      top: { price: 79.99 },
    },
  },
  {
    id: "v2",
    make: "Toyota",
    model: "Tundra",
    years: yr(2014, 2024),
    parts: {
      hoodSet: { price: 99.99 },
      bedside: { price: 169.99 },
      fullSet: { price: 339.99 },
      top: { price: 89.99 },
    },
  },
  {
    id: "v3",
    make: "Toyota",
    model: "4Runner",
    years: yr(2010, 2024),
    parts: {
      hoodSet: { price: 89.99 },
      fullSet: { price: 289.99 },
      top: { price: 79.99 },
    },
  },
  {
    id: "v4",
    make: "Ford",
    model: "F-150",
    years: yr(2015, 2024),
    parts: {
      hoodSet: { price: 99.99 },
      bedside: { price: 159.99 },
      fullSet: { price: 319.99 },
      top: { price: 89.99 },
    },
  },
  {
    id: "v5",
    make: "Ford",
    model: "Bronco",
    years: yr(2021, 2024),
    parts: {
      hoodSet: { price: 94.99 },
      fullSet: { price: 279.99 },
      top: { price: 84.99 },
    },
  },
  {
    id: "v6",
    make: "Ford",
    model: "Ranger",
    years: yr(2019, 2024),
    parts: {
      hoodSet: { price: 84.99 },
      bedside: { price: 139.99 },
      fullSet: { price: 269.99 },
    },
  },
  {
    id: "v7",
    make: "Chevrolet",
    model: "Silverado",
    years: yr(2014, 2024),
    parts: {
      hoodSet: { price: 99.99 },
      bedside: { price: 159.99 },
      fullSet: { price: 319.99 },
      top: { price: 89.99 },
    },
  },
  {
    id: "v8",
    make: "Chevrolet",
    model: "Colorado",
    years: yr(2015, 2024),
    parts: {
      hoodSet: { price: 84.99 },
      bedside: { price: 139.99 },
      fullSet: { price: 264.99 },
    },
  },
  {
    id: "v9",
    make: "Dodge",
    model: "Ram 1500",
    years: yr(2009, 2024),
    parts: {
      hoodSet: { price: 99.99 },
      bedside: { price: 159.99 },
      fullSet: { price: 309.99 },
      top: { price: 89.99 },
    },
  },
  {
    id: "v10",
    make: "Jeep",
    model: "Wrangler",
    years: yr(2007, 2024),
    parts: {
      hoodSet: { price: 79.99 },
      fullSet: { price: 249.99 },
      top: { price: 74.99 },
    },
  },
  {
    id: "v11",
    make: "Jeep",
    model: "Gladiator",
    years: yr(2020, 2024),
    parts: {
      hoodSet: { price: 84.99 },
      bedside: { price: 139.99 },
      fullSet: { price: 269.99 },
    },
  },
  {
    id: "v12",
    make: "GMC",
    model: "Sierra 1500",
    years: yr(2014, 2024),
    parts: {
      hoodSet: { price: 99.99 },
      bedside: { price: 159.99 },
      fullSet: { price: 319.99 },
      top: { price: 89.99 },
    },
  },
];

// In-memory store — resets on server restart.
// For production: replace with Shopify metaobjects, Vercel Postgres, or any DB.
let _vehicles: VehicleSticker[] = structuredClone(SEED_VEHICLES);

export const vehicleStore = {
  getAll(): VehicleSticker[] {
    return _vehicles;
  },
  getById(id: string): VehicleSticker | undefined {
    return _vehicles.find((v) => v.id === id);
  },
  add(v: VehicleSticker): void {
    _vehicles.push(v);
  },
  update(id: string, patch: Partial<VehicleSticker>): void {
    const i = _vehicles.findIndex((v) => v.id === id);
    if (i !== -1) _vehicles[i] = { ..._vehicles[i], ...patch };
  },
  remove(id: string): void {
    _vehicles = _vehicles.filter((v) => v.id !== id);
  },
};
