import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import StoryGallery from "@/components/built-together/StoryGallery";
import ShareButton from "@/components/built-together/ShareButton";
import {
  MONTHS,
  getBuiltTogether,
  instagramEmbedUrl,
  publicBusiness,
  storyPath,
  videoEmbedUrl,
  type BTBusiness,
} from "@/lib/built-together";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 300;

type Params = Promise<{ year: string; slug: string }>;
type SP = Promise<{ preview?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year, slug } = await params;
  const { milestones } = await getBuiltTogether(false);
  const m = milestones.find((x) => String(x.year) === year && x.handle === slug);
  if (!m) return { title: "Built Together | Print Laser Stitch", robots: { index: false } };
  const biz = publicBusiness(m.customer, false);
  const title = m.seoTitle || `${m.title}${biz ? ` — ${biz.name}` : ""}`;
  const desc =
    m.seoDescription ||
    m.summary ||
    `A Built Together milestone from ${m.year} at Print Laser Stitch in Stuart, FL.`;
  const path = storyPath(m);
  return {
    title: `${title} | Built Together`,
    description: desc.slice(0, 160),
    alternates: { canonical: path },
    openGraph: {
      title,
      description: desc.slice(0, 200),
      url: path,
      type: "article",
      images: m.cover ? [{ url: m.cover.url, width: m.cover.width, height: m.cover.height, alt: m.cover.alt || m.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description: desc.slice(0, 200) },
  };
}

function Links({ b }: { b: BTBusiness }) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {b.website && (
        <a
          href={b.website}
          target="_blank"
          rel="noopener noreferrer"
          className="accent-gradient inline-flex min-h-[44px] items-center rounded-md px-6 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black hover:brightness-110"
        >
          Visit Their Website
        </a>
      )}
      {b.instagram && (
        <a
          href={b.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border-soft px-5 py-2.5 text-sm font-bold hover:bg-white/5"
        >
          Instagram
        </a>
      )}
      {b.otherLinks.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-md border border-border-soft px-5 py-2.5 text-sm font-bold hover:bg-white/5"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { year, slug } = await params;
  const preview = (await searchParams).preview === "1";
  const { years, milestones } = await getBuiltTogether(preview);
  const idx = milestones.findIndex((x) => String(x.year) === year && x.handle === slug);
  if (idx < 0) notFound();
  const m = milestones[idx];
  const prev = milestones[idx - 1];
  const next = milestones[idx + 1];
  const yr = years.find((y) => y.year === m.year);
  const biz = publicBusiness(m.customer, preview);
  const partners = m.partners
    .map((p) => publicBusiness(p, preview))
    .filter((p): p is BTBusiness => !!p);
  const q = preview ? "?preview=1" : "";
  const igEmbed = instagramEmbedUrl(m.instagramUrl);
  const vidEmbed = videoEmbedUrl(m.videoUrl);
  const path = storyPath(m);
  const paragraphs = (m.story || "").split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <Header />
      <main className="flex-1">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: m.title,
              description: m.summary,
              datePublished: m.date,
              image: m.cover?.url,
              url: `${SITE_URL}${path}`,
              author: { "@type": "Organization", name: "Print Laser Stitch" },
              publisher: { "@type": "Organization", name: "Print Laser Stitch" },
              about: biz ? { "@type": "Organization", name: biz.name, url: biz.website || undefined } : undefined,
            },
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Built Together", path: "/built-together" },
              { name: String(m.year), path: `/built-together/${m.year}` },
              { name: m.title, path },
            ]),
          ]}
        />

        {/* A — Hero */}
        <section className="relative isolate overflow-hidden">
          {m.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.cover.url}
              alt={m.cover.alt || m.title}
              width={m.cover.width}
              height={m.cover.height}
              className="absolute inset-0 -z-10 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1a1f00] via-[#0a0a0a] to-[#06222a]" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/20" />
          <div className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-end px-4 pb-10 pt-24 sm:px-6">
            <span className="mb-3 w-fit rounded-full border border-accent/60 bg-black/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
              Built Together
            </span>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              {m.title}
            </h1>
            {biz && (
              <p className="mt-2 text-lg text-foreground-muted">Featuring {biz.name}</p>
            )}
            <p className="mt-1 text-sm font-bold text-accent">
              {m.year}
              {m.category ? ` | ${m.category}` : ""}
              {!m.published ? " | DRAFT PREVIEW" : ""}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-14 px-4 py-12 sm:px-6">
          {/* B — The milestone */}
          {(paragraphs.length > 0 || m.summary || m.stats.length > 0) && (
            <section aria-labelledby="bt-milestone">
              <h2 id="bt-milestone" className="font-headline text-2xl font-bold">
                The Milestone
              </h2>
              <p className="mt-1 text-xs text-foreground-muted">
                {MONTHS[m.month - 1]} {m.year}
              </p>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/90">
                {paragraphs.length > 0
                  ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
                  : m.summary && <p>{m.summary}</p>}
              </div>
              {m.stats.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {m.stats.map((s) => (
                    <div
                      key={s.value + s.label}
                      className="rounded-2xl border border-border-soft bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
                    >
                      <dt className="order-2 text-xs text-foreground-muted">{s.label}</dt>
                      <dd className="font-display text-3xl font-bold text-accent">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}

          {/* C — Meet the company */}
          {(biz || partners.length > 0) && (
            <section aria-labelledby="bt-meet" className="space-y-5">
              <h2 id="bt-meet" className="font-headline text-2xl font-bold">
                Meet the {partners.length > 0 ? "Businesses" : "Company"}
              </h2>
              {[biz, ...partners]
                .filter((b): b is BTBusiness => !!b)
                .map((b) => (
                  <article
                    key={b.id}
                    className="rounded-2xl border border-border-soft bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
                  >
                    <div className="flex items-start gap-4">
                      {b.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.logo.url}
                          alt={`${b.name} logo`}
                          width={b.logo.width}
                          height={b.logo.height}
                          loading="lazy"
                          className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain p-1.5"
                        />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-headline text-xl font-bold">{b.name}</h3>
                        <p className="text-xs text-foreground-muted">
                          {[b.specialty, b.industry, b.location].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    {b.story && (
                      <p className="mt-4 text-sm leading-relaxed text-foreground/85">{b.story}</p>
                    )}
                    <Links b={b} />
                  </article>
                ))}
            </section>
          )}

          {/* D — Gallery */}
          {m.gallery.length > 0 && (
            <section aria-labelledby="bt-work">
              <h2 id="bt-work" className="mb-4 font-headline text-2xl font-bold">
                The Work Behind the Milestone
              </h2>
              <StoryGallery images={m.gallery} title={m.title} />
            </section>
          )}

          {/* E — Social / video */}
          {(m.instagramUrl || m.videoUrl) && (
            <section aria-labelledby="bt-social" className="space-y-5">
              <h2 id="bt-social" className="font-headline text-2xl font-bold">
                Watch the Story
              </h2>
              {vidEmbed && (
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border-soft">
                  <iframe
                    src={vidEmbed}
                    title={`${m.title} video`}
                    loading="lazy"
                    className="h-full w-full"
                    allow="encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
              {igEmbed && (
                <div className="mx-auto h-[640px] w-full max-w-[420px] overflow-hidden rounded-2xl border border-border-soft bg-black">
                  <iframe
                    src={igEmbed}
                    title="Instagram post"
                    loading="lazy"
                    className="h-full w-full"
                    allow="encrypted-media"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {m.instagramUrl && (
                  <a
                    href={m.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center rounded-md border border-border-soft px-5 py-2.5 text-sm font-bold hover:bg-white/5"
                  >
                    Watch on Instagram ↗
                  </a>
                )}
                {m.videoUrl && !vidEmbed && (
                  <a
                    href={m.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center rounded-md border border-border-soft px-5 py-2.5 text-sm font-bold hover:bg-white/5"
                  >
                    Watch the video ↗
                  </a>
                )}
              </div>
            </section>
          )}

          {/* F — Thank you */}
          {m.thanks && (
            <section aria-labelledby="bt-thanks" className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
              <h2 id="bt-thanks" className="font-headline text-xl font-bold text-accent">
                Thank You
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed">{m.thanks}</p>
              <p className="mt-3 text-sm text-foreground-muted">— The Print Laser Stitch team</p>
            </section>
          )}

          {/* G — Continue */}
          <section aria-labelledby="bt-more">
            <h2 id="bt-more" className="font-headline text-2xl font-bold">
              Continue Exploring
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/built-together/${m.year}${q}`}
                className="rounded-xl border border-border-soft p-4 font-bold hover:bg-white/5"
              >
                ← Back to the {m.year} timeline
              </Link>
              <Link
                href={`/built-together${q}`}
                className="rounded-xl border border-border-soft p-4 font-bold hover:bg-white/5"
              >
                More community stories
              </Link>
              {prev && (
                <Link
                  href={storyPath(prev) + q}
                  className="rounded-xl border border-border-soft p-4 hover:bg-white/5"
                >
                  <span className="block text-xs text-foreground-muted">Previous</span>
                  <span className="font-bold">{prev.shortTitle}</span>
                </Link>
              )}
              {next && (
                <Link
                  href={storyPath(next) + q}
                  className="rounded-xl border border-border-soft p-4 text-right hover:bg-white/5"
                >
                  <span className="block text-xs text-foreground-muted">Next</span>
                  <span className="font-bold">{next.shortTitle}</span>
                </Link>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <ShareButton title={m.title} />
              {m.serviceUrl.startsWith("/") && (
                <Link href={m.serviceUrl} className="text-sm text-foreground-muted underline hover:text-accent">
                  See our {m.category ? m.category.toLowerCase() : "related"} services
                </Link>
              )}
            </div>
            {yr && (
              <p className="mt-6 text-xs text-foreground-muted">
                {yr.year}: {yr.title}
              </p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
