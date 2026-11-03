import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PRIVATE_PATHS = [
  "/api/",
  "/account",
  "/admin",
  "/cart",
  "/order/",
  "/mobile-proof",
  "/login",
  "/signup",
  "/forgot-password",
  "/products/*/template-fit",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everyone (Google, Bing, and AI search/assistant crawlers such as
      // GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot and
      // Google-Extended) may read the public site.
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
