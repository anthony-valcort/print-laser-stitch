import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us · Print Laser Stitch",
  description:
    "Meet Anthony and the team behind Print Laser Stitch — a small print shop in Stuart, Florida built on late nights, tight deadlines, and the belief that your project matters.",
};

const TEAM = [
  {
    name: "Anthony",
    role: "Founder & Owner",
    initial: "A",
    accent: "from-amber-400 via-orange-500 to-red-500",
    bio: "I started Print Laser Stitch as a passion project — me in a small space, pressing shirts and experimenting with machines just to see what I could create. Word spread, and what started as an idea grew into a business serving individuals, startups, and companies all over Florida and beyond. I still personally handle the majority of the day-to-day, from designing to printing to wrapping orders.",
  },
  {
    name: "Ann-Kristie",
    role: "Apparel Lead · Marketing",
    initial: "AK",
    accent: "from-pink-500 via-fuchsia-500 to-purple-600",
    bio: "Anthony's wife and partner through it all. She pours so much love into the apparel side — heat-pressing every shirt and making sure each piece is perfect before it goes out. She also handles our marketing and social media, helping us share our story and connect with more people.",
  },
  {
    name: "Ali",
    role: "Web Developer",
    initial: "AL",
    accent: "from-sky-500 via-cyan-500 to-blue-600",
    bio: "More than a web developer — Anthony's right-hand man. He's the reason the website works the way it does: easy to browse, easy to order, easy to navigate. Long hours, never complains, and always willing to learn whatever new challenge gets thrown at him. His dedication and loyalty have been a blessing to this business.",
  },
  {
    name: "Jaidyn",
    role: "Production Specialist",
    initial: "J",
    accent: "from-emerald-500 via-green-600 to-teal-700",
    bio: "Smart, driven, and always willing to learn — Jaidyn has mastered nearly all of our machines and plays a hands-on role bringing customers' ideas to life. Her favorite is the embroidery setup, where she brings precision and creativity to every stitch. Her sharp eye for detail keeps our workflow smooth.",
  },
  {
    name: "Jerry",
    role: "Embroidery Digitizer",
    initial: "JR",
    accent: "from-violet-500 via-purple-500 to-indigo-600",
    bio: "Jerry has been with us for over a year and quickly became a key part of what we do. He handles all our embroidery digitizing with care and precision, redrawing every logo by hand — no shortcuts, no auto-digitizing. Fast turnaround, clean stitches, sharp results every time.",
  },
];

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Upload your logo",
    text: "Send us your artwork or let's create one together.",
    icon: "📤",
  },
  {
    n: "02",
    title: "Print it",
    text: "We print in-house with the richest, boldest colors.",
    icon: "🖨️",
  },
  {
    n: "03",
    title: "Protect it",
    text: "Every sticker gets laminated for max durability.",
    icon: "🛡️",
  },
  {
    n: "04",
    title: "Cut it",
    text: "Precision cut and quality checked to perfection.",
    icon: "✂️",
  },
  {
    n: "05",
    title: "Ship it",
    text: "Packed safe and shipped fast — straight to your door.",
    icon: "📦",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/2 z-0 h-120 w-225 -translate-x-1/2 rounded-full opacity-30 blur-3xl accent-gradient" />
          <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-20 text-center sm:px-6 lg:px-8 lg:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-4 py-1 text-xs font-medium text-foreground-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Stuart, Florida · Family-owned
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              The story behind{" "}
              <span className="accent-gradient-text">Print Laser Stitch</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-foreground-muted sm:text-lg">
              Built on late nights, tight deadlines, and a deep belief that
              your project matters just as much to us as it does to you.
            </p>
          </div>
        </section>

        {/* Founder story */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-400/15 blur-3xl" />

            <div className="relative grid items-start gap-10 lg:grid-cols-[auto_1fr]">
              <div className="grid h-32 w-32 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-5xl font-black text-white shadow-2xl shadow-orange-500/30">
                A
              </div>
              <div>
                <span className="inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                  From the founder
                </span>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Hey, I&apos;m Anthony
                </h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/90">
                  <p>
                    I&apos;m the owner of Print Laser Stitch — a small print
                    shop here in Stuart, Florida, built from the ground up on
                    late nights, tight deadlines, and a deep belief that your
                    project matters just as much to us as it does to you.
                  </p>
                  <p>
                    This shop started as a passion project — me in a small
                    space, pressing shirts and experimenting with machines
                    just to see what I could create. Over time, people started
                    to notice the quality, and word spread. What was once just
                    an idea became a growing business that now serves
                    individuals, startups, and companies all over Florida and
                    beyond.
                  </p>
                  <p>
                    And while I still personally handle the majority of the
                    day-to-day — from designing to printing to wrapping orders
                    — I don&apos;t do it alone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the team */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-accent">
              Meet the team
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              The hands behind every order
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground-muted">
              We&apos;re a small team, but we put our whole hearts into every
              order — whether it&apos;s one shirt or a full storefront branding
              package, we treat it like it&apos;s our own business.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <article
                key={member.name}
                className="group relative overflow-hidden rounded-3xl border border-border-soft bg-surface p-6 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent-strong/10"
              >
                <div
                  className={`mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br ${member.accent} text-2xl font-black text-white shadow-lg`}
                >
                  {member.initial}
                </div>
                <h3 className="text-xl font-bold">{member.name}</h3>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  {member.role}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="border-t border-border-soft bg-background-soft/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <span className="inline-block rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-accent">
                How we work
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                From idea to your door —{" "}
                <span className="accent-gradient-text">in five steps</span>
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {PROCESS_STEPS.map((step, idx) => (
                <div
                  key={step.n}
                  className="group relative rounded-2xl border border-border-soft bg-surface p-6 transition hover:-translate-y-1 hover:border-accent/40"
                >
                  <div className="absolute right-4 top-4 text-xs font-bold text-accent/60">
                    {step.n}
                  </div>
                  <div className="text-3xl">{step.icon}</div>
                  <div className="mt-3 text-sm font-bold">{step.title}</div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
                    {step.text}
                  </p>
                  {idx < PROCESS_STEPS.length - 1 && (
                    <div className="pointer-events-none absolute right-0 top-1/2 hidden h-px w-6 -translate-y-1/2 translate-x-3 bg-gradient-to-r from-border-strong to-transparent lg:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ValueCard
              icon="❤️"
              title="Real humans"
              text="Not a call center. A real person picks up the phone, every time."
            />
            <ValueCard
              icon="✨"
              title="In-house quality"
              text="Every order is printed, stitched, or engraved in our Florida shop — never outsourced."
            />
            <ValueCard
              icon="⚡"
              title="Fast turnaround"
              text="24–48 hour production for most orders. Tight deadline? We'll figure it out."
            />
            <ValueCard
              icon="🤝"
              title="Built on trust"
              text="One shirt or a thousand — we treat your project like it's our own business."
            />
          </div>
        </section>

        {/* Contact CTA */}
        <section className="border-t border-border-soft bg-background-soft/40">
          <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <span className="inline-block rounded-full border border-border-soft bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-accent">
              Let&apos;s talk
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Call us. A real human will pick up.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground-muted">
              Thank you for trusting us. We&apos;re honored to be a part of your
              project, and we can&apos;t wait to help bring your vision to life.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <a
                href="tel:7729852854"
                className="rounded-2xl border border-border-soft bg-surface p-6 text-left transition hover:-translate-y-0.5 hover:border-accent/40"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Phone
                </div>
                <div className="mt-2 text-xl font-bold">(772) 985-2854</div>
                <div className="mt-1 text-xs text-foreground-muted">
                  Tap to call →
                </div>
              </a>
              <div className="rounded-2xl border border-border-soft bg-surface p-6 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Hours
                </div>
                <div className="mt-2 text-xl font-bold">Mon – Sat</div>
                <div className="mt-1 text-xs text-foreground-muted">
                  9 AM – 5 PM EST
                </div>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface p-6 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Visit
                </div>
                <div className="mt-2 text-xl font-bold">Stuart, FL</div>
                <div className="mt-1 text-xs text-foreground-muted">
                  Family-owned print shop
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Link
                href="/products/vinyl-stickers"
                className="inline-flex items-center gap-2 rounded-full accent-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-strong/30 hover:opacity-95"
              >
                Start your order
                <svg
                  width="16"
                  height="16"
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
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-6">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl">
        {icon}
      </div>
      <div className="mt-4 text-base font-bold">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
        {text}
      </p>
    </div>
  );
}
