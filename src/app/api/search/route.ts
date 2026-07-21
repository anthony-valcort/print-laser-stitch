import { type NextRequest, NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify";

export type SearchResult = {
  handle: string;
  title: string;
  thumbnail: string | null;
  price: string | null;
};

const SEARCH_PRODUCTS = `
  query SearchProducts {
    products(first: 100, query: "status:active") {
      nodes {
        handle
        title
        descriptionHtml
        featuredImage { url }
        priceRangeV2 { minVariantPrice { amount } }
      }
    }
  }
`;

type RawProduct = {
  handle: string;
  title: string;
  descriptionHtml: string;
  featuredImage: { url: string } | null;
  priceRangeV2: { minVariantPrice: { amount: string } | null } | null;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

/**
 * Simple in-memory substring search over title + description. The catalog
 * is small (a few dozen products), so a full Admin API query + JS filter is
 * simpler and more precise than relying on Shopify's search query DSL.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await shopifyAdminFetch<{ products: { nodes: RawProduct[] } }>(
      SEARCH_PRODUCTS,
      {},
      { tags: ["products:all"], revalidate: 300 },
    );

    const results: SearchResult[] = data.products.nodes
      .filter((p) => {
        const haystack = `${p.title} ${stripHtml(p.descriptionHtml)}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8)
      .map((p) => ({
        handle: p.handle,
        title: p.title,
        thumbnail: p.featuredImage?.url ?? null,
        price: p.priceRangeV2?.minVariantPrice?.amount ?? null,
      }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 });
  }
}
