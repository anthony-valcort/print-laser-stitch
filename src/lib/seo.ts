/**
 * Central SEO settings + structured-data (JSON-LD) builders.
 *
 * Business details here must match what's shown in the footer, on the
 * contact page and on Google Business Profile / Yelp / Facebook — Google
 * ranks local businesses partly on that name/address/phone consistency.
 */

import type { ShopifyProduct } from "@/lib/shopify-products";

export const SITE_URL = "https://www.printlaserstitch.com";
export const SITE_NAME = "Print Laser Stitch";

export const BUSINESS = {
  name: "Print Laser Stitch",
  legalName: "Print Laser Stitch LLC",
  telephone: "+1-772-985-2854",
  email: "info@printlaserstitch.com",
  address: {
    streetAddress: "3153 SE Dominica Terrace",
    addressLocality: "Stuart",
    addressRegion: "FL",
    postalCode: "34997",
    addressCountry: "US",
  },
  /** Cities we serve (Martin County, St. Lucie County, north Palm Beach County). */
  areaServed: [
    "Stuart",
    "Port St. Lucie",
    "Jensen Beach",
    "Palm City",
    "Hobe Sound",
    "Port Salerno",
    "Sewall's Point",
    "Indiantown",
    "Fort Pierce",
    "Jupiter",
    "Tequesta",
    "Martin County",
    "St. Lucie County",
    "Treasure Coast",
  ],
  services: [
    "Custom embroidery",
    "Embroidered polos and uniforms",
    "Screen printing",
    "Custom t-shirt printing",
    "DTF transfers",
    "Custom vinyl stickers",
    "Business card printing",
    "Flyer and poster printing",
    "Vinyl banners",
    "Signs and decals",
    "Vehicle decals",
    "Laser engraving",
    "Graphic design",
  ],
  /** Add the business's public profile URLs here (Google Business Profile,
   * Facebook, Instagram, Yelp…). They help Google connect the website to
   * those listings. */
  sameAs: [] as string[],
};

/**
 * Some Shopify products have a dedicated, hand-built page. The same product
 * is also reachable at /products/{handle}; both URLs must point Google at
 * the dedicated page so they don't compete as duplicates.
 */
export const DEDICATED_PRODUCT_ROUTES: Record<string, string> = {
  "custom-embroidered-polo": "/products/embroidered-polos",
  "cotton-t-shirts": "/products/tshirts",
  "2x3-5-standard-business-cards": "/products/business-cards",
  "custom-banners": "/products/banners",
  flyers: "/products/flyers",
  posters: "/products/posters",
  "custom-lea-engraving-customer-providing-cups-tumblr": "/products/engraved-cups",
  "laser-engraving-custom-wallet": "/products/engraved-wallets",
  "custom-engraved-speed-bottle-opener-stainless-steel": "/products/engraved-bottle-openers",
};

/** The URL Google should index for a product handle. */
export function productPath(handle: string): string {
  return DEDICATED_PRODUCT_ROUTES[handle] ?? `/products/${handle}`;
}

const BUSINESS_ID = `${SITE_URL}/#business`;

function plainText(html: string, max = 500): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** First ~155 characters of a product description, for meta descriptions. */
export function metaDescriptionFromHtml(html: string): string {
  return plainText(html, 155);
}

/** Site-wide: who we are, where we are, what we do. */
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
    image: `${SITE_URL}/og-image.png`,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    description:
      "Print shop in Stuart, Florida offering custom embroidery, screen printing, custom t-shirts and polos, stickers, banners, signs, decals and laser engraving for businesses, teams and individuals across the Treasure Coast.",
    address: { "@type": "PostalAddress", ...BUSINESS.address },
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "Place", name })),
    knowsAbout: BUSINESS.services,
    makesOffer: BUSINESS.services.map((name) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name },
    })),
    ...(BUSINESS.sameAs.length ? { sameAs: BUSINESS.sameAs } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": BUSINESS_ID },
  };
}

/** Product rich-result data: name, photos, price range, availability. */
export function productJsonLd(product: ShopifyProduct, path: string) {
  const prices = product.variants
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const inStock = product.variants.some((v) => v.availableForSale);
  const images = [
    product.featuredImage?.url,
    ...product.images.map((i) => i.url),
  ].filter((u, i, all): u is string => !!u && all.indexOf(u) === i);
  const url = `${SITE_URL}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainText(product.descriptionHtml) || product.title,
    url,
    ...(images.length ? { image: images.slice(0, 6) } : {}),
    brand: { "@type": "Brand", name: BUSINESS.name },
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: Math.min(...prices).toFixed(2),
            highPrice: Math.max(...prices).toFixed(2),
            offerCount: prices.length,
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url,
            seller: { "@id": BUSINESS_ID },
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
