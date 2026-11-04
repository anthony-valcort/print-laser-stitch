import Link from "next/link";

export type CopyLink = { href: string; label: string };

/**
 * A plain-language text block for pages that are mostly a tool (calculator,
 * gallery). Gives visitors the answers they look for and gives search
 * engines real words to rank the page on.
 */
export default function PageCopy({
  heading,
  paragraphs,
  points,
  links,
}: {
  heading: string;
  paragraphs: string[];
  points?: { title: string; text: string }[];
  links?: CopyLink[];
}) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-black uppercase tracking-tight">{heading}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground-muted">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      {points && points.length > 0 && (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {points.map((pt) => (
            <div key={pt.title} className="rounded-2xl border border-border-soft bg-surface p-4">
              <dt className="text-sm font-bold text-foreground">{pt.title}</dt>
              <dd className="mt-1 text-sm text-foreground-muted">{pt.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {links && links.length > 0 && (
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[#18d3e8] hover:underline">
              {l.label} →
            </Link>
          ))}
        </p>
      )}
    </section>
  );
}
