import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import YearTimeline from "@/components/built-together/YearTimeline";
import { getBuiltTogether } from "@/lib/built-together";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Built Together — Our Milestones, Your Stories | Print Laser Stitch",
  description:
    "The story of Print Laser Stitch in Stuart, FL, told through the local businesses and projects that helped us grow. Explore our milestones year by year.",
  alternates: { canonical: "/built-together" },
  openGraph: {
    title: "Built Together — Our Milestones. Your Stories.",
    description:
      "Explore how Print Laser Stitch grew alongside the businesses and people who believed in us.",
    url: "/built-together",
    type: "website",
  },
};

export const revalidate = 300;

export default async function BuiltTogetherPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const sp = await searchParams;
  const preview = sp.preview === "1";
  const { years } = await getBuiltTogether(preview);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Header />
      <main className="flex-1">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Built Together",
            description: "Milestones and community stories from Print Laser Stitch.",
            url: `${SITE_URL}/built-together`,
          }}
        />
        <section className="mx-auto max-w-5xl px-4 pb-6 pt-14 text-center sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
            Print Laser Stitch · Stuart, FL
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-7xl">
            Built Together<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 font-headline text-2xl font-bold text-foreground-muted sm:text-3xl">
            Our Milestones. Your Stories.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-foreground-muted">
            We started in a spare bedroom with a heat press and a dream. Today, we&apos;re
            growing alongside the businesses and people who believed in us. Explore the
            moments that brought us here.
          </p>
          {preview && (
            <p className="mx-auto mt-4 inline-block rounded-full bg-amber-500/15 px-4 py-1.5 text-xs font-bold text-amber-300">
              Draft preview — unpublished placeholders are showing
            </p>
          )}
        </section>

        <section className="px-2 pb-16 pt-6 sm:px-4" aria-label="Choose a year">
          {years.length > 0 ? (
            <>
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-foreground-muted">
                Pick a year to explore
              </p>
              <YearTimeline
                years={years.map((y) => ({
                  year: y.year,
                  title: y.title,
                  description: y.description,
                  count: y.count,
                }))}
                currentYear={currentYear}
              />
            </>
          ) : (
            <p className="mx-auto max-w-md text-center text-sm text-foreground-muted">
              Our first stories are on the way. Check back soon.
            </p>
          )}
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
          <p className="text-sm text-foreground-muted">
            Every story here is a milestone we shared with a real business or group. No
            rankings, just thank-yous.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
