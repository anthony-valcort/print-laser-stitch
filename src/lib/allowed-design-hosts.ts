/** Hosts customer-uploaded design/proof/cutline URLs are allowed to come
 * from — checked server-side at checkout (defense in depth) so a malicious
 * client can't submit an arbitrary attacker-controlled URL as a "design
 * file". Keep in sync with wherever uploads actually land (see
 * src/lib/cloudinary-files.ts). cdn.shopify.com stays allowed for any
 * pre-migration orders/flows still referencing it. */
const ALLOWED_DESIGN_URL_PREFIXES = [
  "https://res.cloudinary.com/",
  "https://cdn.shopify.com/",
];

export function isAllowedDesignUrl(url: string): boolean {
  return ALLOWED_DESIGN_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}
