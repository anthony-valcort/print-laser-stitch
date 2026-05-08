const BADGES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    title: "Free Online Proof",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Printed in 24-48 hours",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2.69 5.64 9.05a9 9 0 1 0 12.72 0z" />
      </svg>
    ),
    title: "Waterproof & Extreme-Weather Tested",
  },
];

export default function TrustBadges() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {BADGES.map((b) => (
          <div
            key={b.title}
            className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface px-5 py-4"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/5">
              {b.icon}
            </span>
            <div className="text-sm font-semibold">{b.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
