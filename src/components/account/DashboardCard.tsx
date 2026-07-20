import Link from "next/link";

export default function DashboardCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border-soft bg-surface p-5 transition hover:border-[#18d3e8]/40 hover:bg-white/5"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-xl text-[#18d3e8]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-headline text-sm font-bold uppercase tracking-wider">
            {title}
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-foreground-muted transition group-hover:translate-x-0.5 group-hover:text-foreground"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
          {description}
        </p>
      </div>
    </Link>
  );
}
