import Image from "next/image";
import Link from "next/link";

const HOURS: { day: string; time: string }[] = [
  { day: "Monday", time: "7am–6pm" },
  { day: "Tuesday", time: "7am–6pm" },
  { day: "Wednesday", time: "7am–6pm" },
  { day: "Thursday", time: "7am–6pm" },
  { day: "Friday", time: "7am–6pm" },
  { day: "Saturday", time: "Closed" },
  { day: "Sunday", time: "Closed" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border-soft bg-background-soft">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Logo + rating */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.avif"
                alt="Print Laser Stitch"
                width={36}
                height={36}
                className="h-9 w-auto"
              />
              <span className="text-lg font-semibold">
                Print Laser <span className="accent-gradient-text">Stitch</span>
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} />
                ))}
              </div>
              <span className="text-sm font-semibold">5.0</span>
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Trusted by hundreds of brands.
            </p>
          </div>

          {/* Products */}
          <FooterColumn
            title="Products"
            items={[
              { label: "Vinyl Stickers", href: "/products/vinyl-stickers" },
              { label: "T-Shirts", href: "/products/tshirts" },
              { label: "Business Cards", href: "/products/business-cards" },
              { label: "Banners", href: "/products/banners" },
              { label: "Embroidery", href: "/products/embroidery-patches" },
              { label: "Engraved Cups", href: "/products/engraved-cups" },
            ]}
          />

          {/* Company */}
          <FooterColumn
            title="Company"
            items={[
              { label: "Shipping Process", href: "#" },
              { label: "Blog Posts", href: "#" },
            ]}
          />

          {/* Support with hours */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <span>🎧</span> Support
            </div>
            <ul className="space-y-2 text-sm text-foreground-muted">
              <li>
                <a
                  className="hover:text-foreground"
                  href="mailto:office@psolutionservices.com"
                >
                  Help
                </a>
              </li>
              <li>
                <Link className="hover:text-foreground" href="#">
                  Returns
                </Link>
              </li>
            </ul>
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Hours <span className="text-foreground-muted">(Mountain Time)</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-foreground-muted">
                {HOURS.map((h) => (
                  <li key={h.day} className="flex items-center justify-between gap-2">
                    <span>{h.day}</span>
                    <span className={h.time === "Closed" ? "text-foreground-muted/60" : "text-foreground/80"}>
                      {h.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Shop */}
          <FooterColumn
            title="Shop"
            items={[
              { label: "Start Your Order →", href: "/products/vinyl-stickers" },
              { label: "Log in", href: "/login" },
              { label: "Signup", href: "/signup" },
            ]}
          />

          {/* Mission + social */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <span>🚀</span> Our Mission
            </div>
            <p className="text-xs leading-relaxed text-foreground-muted">
              We&apos;re Print Laser Stitch — our mission is to deliver custom
              prints, apparel, and engraving to your door as fast as humanly
              possible.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground hover:bg-white/5"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground hover:bg-white/5"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border-soft pt-6 text-xs text-foreground-muted sm:flex-row">
          <div className="flex flex-wrap items-center gap-4">
            <span>© {new Date().getFullYear()} Print Laser Stitch</span>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Cookies</Link>
            <Link href="#" className="hover:text-foreground">DMCA</Link>
          </div>
          <div className="flex items-center gap-2">
            <span>Built with</span>
            <span className="text-rose-400">♥</span>
            <span>by © Print Laser Stitch</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Star() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#facc15" aria-hidden>
      <path d="M12 2.25l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77 5.82 21.25 7 14.38l-5-4.87 6.91-1z" />
    </svg>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div className="lg:col-span-1">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <ul className="mt-4 space-y-2 text-sm text-foreground-muted">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
