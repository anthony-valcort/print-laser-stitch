import { unstable_cache } from "next/cache";
import { shopifyStorefrontFetch } from "./shopify-storefront";
import type { ShopifyImage } from "./shopify-products";

/**
 * Anthony's existing blog lives in the Shopify store under a single blog
 * ("News", handle `news`). We surface it on the marketing site via the
 * Storefront API — the Admin token does not carry the `read_content` scope,
 * but the Storefront API exposes published articles unauthenticated.
 */
const BLOG_HANDLE = "news";

export type BlogArticleSummary = {
  handle: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  image: ShopifyImage | null;
  author: string | null;
};

export type BlogArticle = BlogArticleSummary & {
  contentHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

const ARTICLES_LIST = `
  query BlogArticles($first: Int!) {
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        handle
        title
        excerpt
        publishedAt
        image { url altText }
        authorV2 { name }
      }
    }
  }
`;

type RawArticlesListResp = {
  articles: {
    nodes: Array<{
      handle: string;
      title: string;
      excerpt: string | null;
      publishedAt: string;
      image: ShopifyImage | null;
      authorV2: { name: string | null } | null;
    }>;
  };
};

async function fetchBlogArticles(
  limit: number,
): Promise<BlogArticleSummary[]> {
  const data = await shopifyStorefrontFetch<RawArticlesListResp>(
    ARTICLES_LIST,
    { first: limit },
  );

  return data.articles.nodes.map((a) => ({
    handle: a.handle,
    title: a.title,
    excerpt: a.excerpt?.trim() ?? "",
    publishedAt: a.publishedAt,
    image: a.image,
    author: a.authorV2?.name ?? null,
  }));
}

/**
 * Latest published blog articles. Wrapped in `unstable_cache` because the
 * Storefront fetch is a POST with `no-store`, so it would otherwise hit
 * Shopify on every render. Blog posts change rarely — refresh every 10 min;
 * bust on demand via `revalidateTag("blog:all")`.
 */
export const getBlogArticles = unstable_cache(
  fetchBlogArticles,
  ["pls-blog-articles"],
  { revalidate: 600, tags: ["blog:all"] },
);

const ARTICLE_BY_HANDLE = `
  query ArticleByHandle($blogHandle: String!, $handle: String!) {
    blogByHandle(handle: $blogHandle) {
      articleByHandle(handle: $handle) {
        handle
        title
        excerpt
        publishedAt
        contentHtml
        image { url altText }
        authorV2 { name }
        seo { title description }
      }
    }
  }
`;

type RawArticleByHandleResp = {
  blogByHandle: {
    articleByHandle: {
      handle: string;
      title: string;
      excerpt: string | null;
      publishedAt: string;
      contentHtml: string;
      image: ShopifyImage | null;
      authorV2: { name: string | null } | null;
      seo: { title: string | null; description: string | null } | null;
    } | null;
  } | null;
};

async function fetchArticleByHandle(
  handle: string,
): Promise<BlogArticle | null> {
  const data = await shopifyStorefrontFetch<RawArticleByHandleResp>(
    ARTICLE_BY_HANDLE,
    { blogHandle: BLOG_HANDLE, handle },
  );

  const a = data.blogByHandle?.articleByHandle;
  if (!a) return null;

  return {
    handle: a.handle,
    title: a.title,
    excerpt: a.excerpt?.trim() ?? "",
    publishedAt: a.publishedAt,
    contentHtml: a.contentHtml ?? "",
    image: a.image,
    author: a.authorV2?.name ?? null,
    seoTitle: a.seo?.title ?? null,
    seoDescription: a.seo?.description ?? null,
  };
}

/**
 * One article + its HTML body. `unstable_cache` keys automatically by the
 * `handle` argument, so each article gets its own cache entry.
 */
export const getArticleByHandle = unstable_cache(
  fetchArticleByHandle,
  ["pls-blog-article"],
  { revalidate: 600, tags: ["blog:all"] },
);
