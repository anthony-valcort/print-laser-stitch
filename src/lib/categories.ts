export type Category = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  href: string;
};

export const categories: Category[] = [
  {
    slug: "vinyl-stickers",
    name: "Stickers",
    tagline: "Waterproof vinyl stickers",
    description:
      "Premium die-cut and kiss-cut vinyl stickers. Glossy or matte finish.",
    emoji: "🌟",
    href: "/products/vinyl-stickers",
  },
  {
    slug: "tshirts",
    name: "T-Shirts",
    tagline: "Custom printed apparel",
    description:
      "Soft-touch DTG and screen-printed tees in every color and size.",
    emoji: "👕",
    href: "/products/tshirts",
  },
  {
    slug: "business-cards",
    name: "Business Cards",
    tagline: "Make a first impression",
    description:
      "Matte, glossy, and premium spot-UV cards on heavy stock paper.",
    emoji: "💳",
    href: "/products/business-cards",
  },
  {
    slug: "flyers",
    name: "Flyers",
    tagline: "Eye-catching handouts",
    description:
      "Full-color flyers in standard sizes, ready for events and mailers.",
    emoji: "📄",
    href: "/products/flyers",
  },
  {
    slug: "posters",
    name: "Posters",
    tagline: "Bold prints, big impact",
    description:
      "Vibrant large-format posters on satin and matte paper finishes.",
    emoji: "🖼️",
    href: "/products/posters",
  },
  {
    slug: "brochures",
    name: "Brochures",
    tagline: "Bi-fold and tri-fold",
    description:
      "Professional brochures that tell your brand's full story.",
    emoji: "📑",
    href: "/products/brochures",
  },
  {
    slug: "banners",
    name: "Banners",
    tagline: "Indoor & outdoor banners",
    description:
      "Heavy-duty vinyl banners for trade shows, storefronts, and events.",
    emoji: "🚩",
    href: "/products/banners",
  },
  {
    slug: "car-magnets",
    name: "Car Magnets",
    tagline: "Custom car magnets",
    description:
      "Removable, weather-proof magnets for vehicles and metal surfaces.",
    emoji: "🚗",
    href: "/products/car-magnets",
  },
  {
    slug: "embroidery-patches",
    name: "Embroidery Patches",
    tagline: "Stitched custom patches",
    description:
      "Iron-on, sew-on, or velcro-back patches with detailed stitching.",
    emoji: "🪡",
    href: "/products/embroidery-patches",
  },
  {
    slug: "embroidery-polo",
    name: "Embroidery Polos",
    tagline: "Stitched logo polos",
    description:
      "Premium polo shirts with embroidered logos for teams and uniforms.",
    emoji: "🎽",
    href: "/products/embroidery-polo",
  },
  {
    slug: "engraved-cups",
    name: "Engraved Cups",
    tagline: "Laser-etched drinkware",
    description:
      "Stainless steel and glass cups with permanent laser engraving.",
    emoji: "🥤",
    href: "/products/engraved-cups",
  },
  {
    slug: "engraved-wallets",
    name: "Engraved Wallets",
    tagline: "Personalized leather goods",
    description:
      "Genuine leather wallets engraved with names, logos, or art.",
    emoji: "👛",
    href: "/products/engraved-wallets",
  },
  {
    slug: "custom-canvas",
    name: "Custom Canvas",
    tagline: "Gallery-grade canvas prints",
    description:
      "Stretched canvas prints made for walls that need a story.",
    emoji: "🎨",
    href: "/products/custom-canvas",
  },
];
