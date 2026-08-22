import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us · Print Laser Stitch",
  description:
    "Get in touch with Print Laser Stitch — send us a message and we'll get back to you, or call/visit our Stuart, Florida shop.",
};

const INFO_CARDS = [
  {
    href: "tel:7729852854",
    external: false,
    accent: "from-[#18d3e8]/15 to-[#18d3e8]/0",
    ring: "hover:border-[#18d3e8]/50",
    iconColor: "text-[#18d3e8]",
    label: "Phone",
    icon: (
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    ),
    title: "(772) 985-2854",
    sub: "Tap to call →",
  },
  {
    href: "mailto:info@printlaserstitch.com",
    external: false,
    accent: "from-[#d94cb3]/15 to-[#d94cb3]/0",
    ring: "hover:border-[#d94cb3]/50",
    iconColor: "text-[#d94cb3]",
    label: "Email",
    icon: (
      <>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </>
    ),
    title: "info@printlaserstitch.com",
    sub: "Tap to email →",
    titleClass: "break-all text-lg",
  },
  {
    href: null,
    accent: "from-[#d9f000]/15 to-[#d9f000]/0",
    ring: "hover:border-[#d9f000]/50",
    iconColor: "text-[#d9f000]",
    label: "Hours (Eastern Time)",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    hours: [
      { day: "Mon – Fri", time: "7:30am – 5:30pm" },
      { day: "Sat", time: "10am – 1:30pm" },
      { day: "Sun", time: "Closed" },
    ],
  },
  {
    href: "https://www.google.com/maps/search/?api=1&query=3141+SE+Dominica+Terrace%2C+Stuart%2C+FL+34997",
    external: true,
    accent: "from-[#18d3e8]/15 to-[#d94cb3]/0",
    ring: "hover:border-[#18d3e8]/50",
    iconColor: "text-[#18d3e8]",
    label: "Visit",
    icon: (
      <>
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    title: "3141 SE Dominica Terrace",
    sub: "Stuart, FL 34997",
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/2 z-0 h-120 w-225 -translate-x-1/2 rounded-full opacity-30 blur-3xl accent-gradient animate-drift-1" />
          <div className="pointer-events-none absolute -right-32 top-20 z-0 h-72 w-72 rounded-full bg-[#d94cb3]/15 blur-3xl animate-drift-2" />
          <div className="dot-grid pointer-events-none absolute inset-0 z-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 pb-8 pt-20 text-center sm:px-6 lg:px-8 lg:pt-28">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-4 py-1 text-xs font-medium text-foreground-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18d3e8] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#18d3e8]" />
              </span>
              We usually reply within a business day
            </span>
            <h1
              className="animate-fade-up mt-6 text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ animationDelay: "80ms" }}
            >
              Get in <span className="accent-gradient-text">touch</span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-5 max-w-xl text-base text-foreground-muted sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              Questions about an order, a custom project, or anything else —
              send us a message and a real person will get back to you.
            </p>
          </div>
        </section>

        <section className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div className="space-y-4">
              {INFO_CARDS.map((card, i) => {
                const Wrapper = card.href ? "a" : "div";
                return (
                  <Wrapper
                    key={card.label}
                    {...(card.href
                      ? {
                          href: card.href,
                          ...(card.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {}),
                        }
                      : {})}
                    className={`animate-fade-up group relative block overflow-hidden rounded-2xl border border-border-soft bg-surface p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 ${card.ring}`}
                    style={{ animationDelay: `${220 + i * 90}ms` }}
                  >
                    <div
                      className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br ${card.accent} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
                    />
                    <div className="relative flex items-start gap-4">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {card.icon}
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                          {card.label}
                        </div>
                        {card.hours ? (
                          <div className="mt-2 space-y-1 text-sm">
                            {card.hours.map((h) => (
                              <div key={h.day} className="flex justify-between gap-3">
                                <span className="text-foreground-muted">{h.day}</span>
                                <span
                                  className={
                                    h.time === "Closed"
                                      ? "text-foreground-muted/60"
                                      : "font-medium"
                                  }
                                >
                                  {h.time}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <div className={`mt-1 font-bold ${card.titleClass ?? "text-xl"}`}>
                              {card.title}
                            </div>
                            {card.sub && (
                              <div className="mt-1 text-xs text-foreground-muted transition group-hover:text-foreground">
                                {card.sub}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>

            <div
              className="animate-fade-up"
              style={{ animationDelay: `${220 + INFO_CARDS.length * 90}ms` }}
            >
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
