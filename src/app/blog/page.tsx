import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getBlogArticles } from "@/lib/shopify-blog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Blog · Print Laser Stitch",
  description:
    "Guides, tips and behind-the-scenes from the Print Laser Stitch print shop — window graphics, vehicle wraps, DTF, apparel and more.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPage() {
  let articles: Awaited<ReturnType<typeof getBlogArticles>> = [];
  try {
    articles = await getBlogArticles(30);
  } catch {
    articles = [];
  }

  const [featured, ...rest] = articles;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Header band */}
        <section className="relative overflow-hidden border-b border-border-soft">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#18d3e8]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#d94cb3]/15 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#18d3e8]/30 bg-[#18d3e8]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#18d3e8]" />
              The print desk
            </span>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
              From the{" "}
              <span className="accent-gradient-text">workshop</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-foreground-muted sm:text-base">
              Practical guides, hard-won lessons and behind-the-scenes notes on
              printing, wraps, DTF and apparel — straight from our team.
            </p>
          </div>
        </section>

        {articles.length === 0 ? (
          <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <div className="text-4xl">📝</div>
            <h2 className="mt-4 text-xl font-bold">No posts yet</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              New articles are on the way — check back soon.
            </p>
          </section>
        ) : (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            {/* Featured — most recent */}
            <Link
              href={`/blog/${featured.handle}`}
              className="group relative grid overflow-hidden rounded-3xl border border-border-soft bg-surface transition hover:border-[#d9f000]/40 hover:shadow-[0_0_50px_rgba(217,240,0,0.15)] lg:grid-cols-2"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/5 lg:aspect-auto lg:h-full">
                {featured.image?.url ? (
                  <Image
                    src={featured.image.url}
                    alt={featured.image.altText ?? featured.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-5xl">
                    📰
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
                <span className="font-headline text-[11px] uppercase tracking-[0.2em] text-[#d9f000]">
                  Latest post · {formatDate(featured.publishedAt)}
                </span>
                <h2 className="font-display text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="line-clamp-3 text-sm text-foreground-muted">
                    {featured.excerpt}
                  </p>
                )}
                <span className="mt-2 inline-flex w-fit items-center gap-2 font-headline text-sm font-bold uppercase tracking-wider text-[#18d3e8]">
                  Read article
                  <Arrow />
                </span>
              </div>
            </Link>

            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a) => (
                  <Link
                    key={a.handle}
                    href={`/blog/${a.handle}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface transition hover:-translate-y-1 hover:border-[#18d3e8]/40 hover:shadow-[0_0_40px_rgba(24,211,232,0.15)]"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/5">
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
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <span className="font-headline text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
                        {formatDate(a.publishedAt)}
                      </span>
                      <h3 className="font-headline text-base font-semibold leading-snug group-hover:text-[#18d3e8]">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="line-clamp-2 text-sm text-foreground-muted">
                          {a.excerpt}
                        </p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-headline text-xs font-bold uppercase tracking-wider text-foreground/70 group-hover:text-[#18d3e8]">
                        Read more
                        <Arrow size={12} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
