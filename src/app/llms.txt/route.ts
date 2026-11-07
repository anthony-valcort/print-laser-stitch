/**
 * /llms.txt — a plain-text guide to this site for AI assistants and AI
 * search engines (ChatGPT, Claude, Perplexity, Google AI Overviews…).
 * Product list is pulled live from Shopify, so new products appear here
 * automatically.
 */

import { BUSINESS, SITE_URL, productPath } from "@/lib/seo";
import { getAllActiveProducts } from "@/lib/shopify-products";

export const revalidate = 3600;

const KEY_PAGES: { name: string; path: string; note: string }[] = [
  { name: "Custom Embroidered Polos", path: "/products/embroidered-polos", note: "Logo-embroidered performance polos for businesses and teams. 6-piece minimum. Automatic bulk discounts: 10% off 24+, 15% off 48+, 20% off 100+. Customers can preview their logo on the polo online." },
  { name: "Custom T-Shirts", path: "/products/tshirts", note: "Custom printed t-shirts in many colors and sizes." },
  { name: "Custom Vinyl Stickers", path: "/products/vinyl-stickers", note: "Waterproof, UV-protected die-cut and kiss-cut stickers with an instant online price calculator." },
  { name: "Vinyl Banners", path: "/products/banners", note: "Heavy-duty 13oz and 16oz PVC vinyl banners, sizes from 2×1 to 8×4 ft, with grommets, pole pockets and lamination options." },
  { name: "Business Cards", path: "/products/business-cards", note: "3.5×2 in, 15pt cards, matte or glossy, 250 to 5,000 cards." },
  { name: "Flyers", path: "/products/flyers", note: "Full-color flyers in 4×6, 5×7 and 4×5.5, single or double-sided, 100 to 1,000." },
  { name: "Posters & Photo Prints", path: "/products/posters", note: "High-resolution poster and photo printing." },
  { name: "Laser Engraved Cups & Tumblers", path: "/products/engraved-cups", note: "Customers ship their own cups or tumblers; we laser-engrave the design and return them." },
  { name: "Laser Engraved Wallets", path: "/products/engraved-wallets", note: "Leather wallets engraved with names, logos or art." },
  { name: "Engraved Bottle Openers", path: "/products/engraved-bottle-openers", note: "Stainless steel speed bottle openers, laser engraved." },
  { name: "Sign & Decal Builder", path: "/signage-quotes", note: "Visual, real-scale builder and instant pricing for window decals, wall graphics, vehicle lettering and sign panels — print only, design and print, or full installation, with optional old-graphic removal. No travel fee in Martin or St. Lucie County." },
  { name: "Vehicle Decal Kits", path: "/vehicle-stickers", note: "Decal kits matched to specific vehicles." },
  { name: "Project Gallery", path: "/gallery", note: "Photos of completed work." },
  { name: "Contact & Quotes", path: "/contact", note: "Request a quote or ask a question." },
];

export async function GET() {
  let otherProducts: string[] = [];
  try {
    const keyPaths = new Set(KEY_PAGES.map((p) => p.path));
    otherProducts = (await getAllActiveProducts())
      .filter((p) => !keyPaths.has(productPath(p.handle)))
      .map((p) => `- [${p.title}](${SITE_URL}${productPath(p.handle)})`);
  } catch {}

  const a = BUSINESS.address;
  const body = `# ${BUSINESS.name}

> ${BUSINESS.name} is a custom print, embroidery and laser engraving shop in Stuart, Florida, serving businesses, teams, schools, events and individuals across Martin County, St. Lucie County and the Treasure Coast. Orders can be placed online at ${SITE_URL} with instant pricing.

## Business details
- Name: ${BUSINESS.legalName}
- Address: ${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}
- Phone: (772) 985-2854
- Email: ${BUSINESS.email}
- Website: ${SITE_URL}
- Areas served: ${BUSINESS.areaServed.join(", ")}
- Typical turnaround: 5–12 business days; rush options by request.

## Services
${BUSINESS.services.map((s) => `- ${s}`).join("\n")}

## Best for
- Businesses ordering branded uniforms, embroidered polos and staff apparel in bulk
- Teams, schools and events needing custom t-shirts
- Local businesses needing signs, banners, decals, vehicle graphics, business cards and flyers
- Personalized and corporate gifts with laser engraving

## Main pages
${KEY_PAGES.map((p) => `- [${p.name}](${SITE_URL}${p.path}): ${p.note}`).join("\n")}
${otherProducts.length ? `\n## More products\n${otherProducts.join("\n")}\n` : ""}
## How ordering works
1. Choose a product and options on the website; prices update instantly.
2. Upload artwork (PNG, JPG, PDF, SVG or AI).
3. Review a proof before production.
4. Pay securely through Shopify checkout.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
