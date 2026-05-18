const FAQS: { q: string; a: string }[] = [
  {
    q: "Which file types work best?",
    a: "Send us PNG, JPG, PDF, SVG or AI. For the sharpest print, aim for 300 DPI or higher — and a transparent background helps a lot when you want a clean die-cut.",
  },
  {
    q: "Do I see the design before it prints?",
    a: "Always. You get an online proof to review and approve first, and you can ask for tweaks until it looks right. Nothing goes on the press without your go-ahead.",
  },
  {
    q: "How fast will my order arrive?",
    a: "Most jobs are produced in 24–48 hours, then handed to the carrier — typically 2–4 business days in transit depending on where you are.",
  },
  {
    q: "Are there bulk discounts?",
    a: "Yes — larger quantities automatically drop the per-unit price. Planning a big run (500+)? Reach out and we'll put together a custom quote for you.",
  },
];

export default function FAQSection() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-3 py-1 font-headline text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9f000]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d9f000]" />
          Good to know
        </span>
        <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Questions, <span className="accent-gradient-text">answered</span>
        </h2>
        <p className="mt-3 text-sm text-foreground-muted">
          The things customers ask us most before placing an order.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((item, i) => (
          <details
            key={i}
            className="group overflow-hidden rounded-2xl border border-border-soft bg-surface transition-colors open:border-[#d9f000]/40 hover:border-border-strong"
          >
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-sm font-black text-foreground-muted transition-colors group-open:text-[#d9f000]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-semibold sm:text-base">
                {item.q}
              </span>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border-strong text-foreground-muted transition-transform duration-300 group-open:rotate-45 group-open:border-[#d9f000]/50 group-open:text-[#d9f000]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </summary>
            <div className="border-t border-border-soft px-5 py-4 pl-13 text-sm leading-relaxed text-foreground-muted sm:px-6 sm:pl-15">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
