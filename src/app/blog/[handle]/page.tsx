import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getArticleByHandle, getBlogArticles } from "@/lib/shopify-blog";

export const revalidate = 600;

type Params = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  try {
    const article = await getArticleByHandle(handle);
    if (!article) return { title: "Post not found · Print Laser Stitch" };
    return {
      title: article.seoTitle ?? `${article.title} · Print Laser Stitch`,
      description:
        article.seoDescription ||
        article.excerpt ||
        `Read "${article.title}" on the Print Laser Stitch blog.`,
    };
  } catch {
    return { title: "Blog · Print Laser Stitch" };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Shopify article bodies are HTML authored by the store owner (trusted). No
 * Tailwind typography plugin is installed, so we style the rendered markup
 * with scoped descendant variants to stay on-brand (neon-on-black).
 */
const ARTICLE_PROSE =
  "max-w-none text-[15px] leading-7 text-foreground/85 " +
  "[&_p]:my-5 " +
  "[&_a]:font-medium [&_a]:text-[#18d3e8] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#d9f000] " +
  "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-foreground sm:[&_h2]:text-3xl " +
  "[&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:font-headline [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-foreground " +
  "[&_h4]:mt-7 [&_h4]:mb-2 [&_h4]:font-headline [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-foreground " +
  "[&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 " +
  "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 " +
  "[&_li]:marker:text-[#d9f000] " +
  "[&_img]:my-7 [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-border-soft " +
  "[&_blockquote]:my-6 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-[#d9f000] [&_blockquote]:bg-white/[0.03] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-foreground-muted [&_blockquote]:italic " +
  "[&_hr]:my-10 [&_hr]:border-border-soft " +
  "[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
  "[&_th]:border [&_th]:border-border-soft [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left " +
  "[&_td]:border [&_td]:border-border-soft [&_td]:px-3 [&_td]:py-2 " +
  "[&_iframe]:my-7 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-2xl";

export default async function ArticlePage({
  params,
}: {
  params: Params;
}) {
  const { handle } = await params;

  let article = null;
  try {
    article = await getArticleByHandle(handle);
  } catch {
    article = null;
  }

  if (!article) notFound();

  let more: Awaited<ReturnType<typeof getBlogArticles>> = [];
  try {
    more = (await getBlogArticles(7))
      .filter((a) => a.handle !== article!.handle)
      .slice(0, 3);
  } catch {
    more = [];
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border-soft bg-background-soft/60">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 text-xs sm:px-6">
            <Link
              href="/"
              className="text-foreground-muted hover:text-foreground"
            >
              Home
            </Link>
            <span className="text-foreground-muted/40">/</span>
            <Link
              href="/blog"
              className="text-foreground-muted hover:text-foreground"
            >
              Blog
            </Link>
            <span className="text-foreground-muted/40">/</span>
            <span className="line-clamp-1 font-medium">{article.title}</span>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <header>
            <span className="font-headline text-[11px] uppercase tracking-[0.2em] text-[#d9f000]">
              {formatDate(article.publishedAt)}
              {article.author ? ` · by ${article.author}` : ""}
            </span>
            <h1 className="mt-4 font-display text-3xl font-black uppercase leading-[1.1] tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-4 text-base text-foreground-muted">
                {article.excerpt}
              </p>
            )}
          </header>

          {article.image?.url && (
            <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-2xl border border-border-soft bg-white/5">
              <Image
                src={article.image.url}
                alt={article.image.altText ?? article.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div
            className={`mt-10 ${ARTICLE_PROSE}`}
            // Shopify article HTML is authored by the store owner (trusted).
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />

          <div className="mt-12 border-t border-border-soft pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/5 px-5 py-2 font-headline text-sm font-semibold uppercase tracking-wider hover:bg-white/10"
            >
              ← All posts
            </Link>
          </div>
        </article>

        {more.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <h2 className="mb-6 font-display text-2xl font-black uppercase tracking-tight">
              Keep reading
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((a) => (
                <Link
                  key={a.handle}
                  href={`/blog/${a.handle}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-[#18d3e8]/40"
                >
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-white/5">
                    {a.image?.url ? (
                      <Image
                        src={a.image.url}
                        alt={a.image.altText ?? a.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-4xl">
                        📰
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <span className="font-headline text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
                      {formatDate(a.publishedAt)}
                    </span>
                    <h3 className="font-headline text-base font-semibold leading-snug group-hover:text-[#18d3e8]">
                      {a.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
