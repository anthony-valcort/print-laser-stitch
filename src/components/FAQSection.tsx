const FAQS: { q: string; a: string }[] = [
  {
    q: "What file formats do you accept?",
    a: "We accept PNG, JPG, PDF, SVG, and AI files. For best results, upload high-resolution files (300 DPI or higher) with transparent backgrounds when possible.",
  },
  {
    q: "Can I get a proof before printing?",
    a: "Yes — we provide a free online proof before printing. You'll receive it within 24 hours and can request revisions.",
  },
  {
    q: "How long does shipping take?",
    a: "Most orders are produced within 24–48 hours, then shipped UPS Ground (2–4 business days).",
  },
  {
    q: "Can I order in bulk?",
    a: "Absolutely. Quantity discounts kick in automatically — for very large runs (500+) reach out and we'll quote a custom rate.",
  },
];

export default function FAQSection() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="text-5xl font-black tracking-tight text-highlight sm:text-6xl">
          FAQ
        </h2>
        <p className="mt-3 text-sm text-foreground-muted">
          A quick chat with our print team.
        </p>
      </div>

      <div className="space-y-6">
        {FAQS.map((item, i) => (
          <div key={i} className="space-y-3">
            {/* User question */}
            <div className="flex items-start gap-3">
              <Avatar label="U" tone="muted" />
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border-soft bg-white/[0.04] px-4 py-3 text-sm">
                {item.q}
              </div>
            </div>
            {/* Brand answer */}
            <div className="flex items-start gap-3 justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-border-soft bg-surface-elevated px-4 py-3 text-sm">
                {item.a}
              </div>
              <Avatar label="P" tone="accent" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Avatar({ label, tone }: { label: string; tone: "muted" | "accent" }) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${
        tone === "accent"
          ? "accent-gradient"
          : "bg-white/10 ring-1 ring-border-soft"
      }`}
    >
      {label}
    </span>
  );
}
