export type Category = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Used when the category came from the hardcoded fallback list. */
  emoji?: string;
  /** Used when the category was built from a live Shopify product. */
  imageUrl?: string;
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
    slug: "banners",
    name: "Banners",
    tagline: "Indoor & outdoor banners",
    description:
      "Heavy-duty vinyl banners for trade shows, storefronts, and events.",
    emoji: "🚩",
    href: "/products/banners",
  },
  {
    slug: "embroidered-polos",
    name: "Embroidered Polos",
    tagline: "Stitched logo polos",
    description:
      "Performance and cotton polos with custom-embroidered logos. Min 6 pcs.",
    emoji: "🎽",
    href: "/products/embroidered-polos",
  },
  {
    slug: "engraved-cups",
    name: "Engraved Cups",
    tagline: "Laser-etched drinkware",
    description:
      "Ship us your tumblers — we'll laser-engrave your design and send them back.",
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
    slug: "engraved-bottle-openers",
    name: "Engraved Bottle Openers",
    tagline: "Stainless steel · laser engraved",
    description:
      "Personalized speed bottle openers — perfect for bars, weddings, corporate gifts.",
    emoji: "🍾",
    href: "/products/engraved-bottle-openers",
  },
  {
    slug: "signage-quotes",
    name: "Custom Signage Quote",
    tagline: "Banners · yard signs · aluminum",
    description:
      "Instant pricing for standard sizes, quote on request for custom dimensions.",
    emoji: "🪧",
    href: "/signage-quotes",
  },
];
