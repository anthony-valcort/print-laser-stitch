import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import YearTree, { type TreeItem } from "@/components/built-together/YearTree";
import {
  getBuiltTogether,
  publicBusiness,
  storyPath,
} from "@/lib/built-together";

export const revalidate = 300;

type Params = Promise<{ year: string }>;
type SP = Promise<{ preview?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year } = await params;
  const { years } = await getBuiltTogether(false);
  const y = years.find((v) => String(v.year) === year);
  const title = `${year}${y?.title ? ` — ${y.title}` : ""} | Built Together`;
  return {
    title: `${title} | Print Laser Stitch`,
    description:
      y?.description ||
      `Milestones and community stories from ${year} at Print Laser Stitch in Stuart, FL.`,
    alternates: { canonical: `/built-together/${year}` },
  };
}

export default async function YearPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { year: yearParam } = await params;
  const preview = (await searchParams).preview === "1";
  const yearNum = Number(yearParam);
  const { years, milestones } = await getBuiltTogether(preview);
  const idx = years.findIndex((y) => y.year === yearNum);
  if (idx < 0) notFound();
  const y = years[idx];
  const prev = years[idx - 1];
  const next = years[idx + 1];

  const now = new Date();
  const maxMonth = yearNum === now.getFullYear() ? now.getMonth() + 1 : 12;

  const items: TreeItem[] = milestones
    .filter((m) => m.year === yearNum)
    .map((m) => {
      const biz = publicBusiness(m.customer, preview);
      return {
        id: m.id,
        href: storyPath(m) + (preview ? "?preview=1" : ""),
        title: m.title,
        shortTitle: m.shortTitle,
        month: m.month,
        day: Number(m.date.slice(8, 10)),
        category: m.category,
        customerName: biz?.name || null,
        stat: m.stats[0] ? `${m.stats[0].value} ${m.stats[0].label}` : null,
        summary: m.summary,
        cover: m.cover,
        hasVideo: !!(m.videoUrl || m.instagramUrl),
        draft: !m.published,
      };
    });

  const q = preview ? "?preview=1" : "";

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-xs text-foreground-muted">
            <Link href={`/built-together${q}`} className="hover:text-accent">
              ← All years
            </Link>
          </nav>

          <header className="mt-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
              Built Together
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              {y.year}
              {y.title && (
                <span className="mt-2 block font-headline text-2xl font-bold text-foreground-muted sm:text-3xl">
                  {y.title}
                </span>
              )}
            </h1>
            {(y.intro || y.description) && (
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-foreground-muted">
                {y.intro || y.description}
              </p>
            )}
          </header>

          {items.length > 0 ? (
            <YearTree items={items} year={yearNum} maxMonth={maxMonth} />
          ) : (
            <p className="mx-auto mt-12 max-w-md text-center text-sm text-foreground-muted">
              Stories from {y.year} are coming soon.
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {prev ? (
              <Link
                href={`/built-together/${prev.year}${q}`}
                className="rounded-full border border-border-soft px-5 py-2.5 text-sm font-bold hover:bg-white/5"
              >
                ← {prev.year}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/built-together/${next.year}${q}`}
                className="rounded-full border border-border-soft px-5 py-2.5 text-sm font-bold hover:bg-white/5"
              >
                {next.year} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
