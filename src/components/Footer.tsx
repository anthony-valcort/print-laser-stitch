import Image from "next/image";
import Link from "next/link";

const HOURS: { day: string; time: string }[] = [
  { day: "Monday", time: "9am–5pm" },
  { day: "Tuesday", time: "9am–5pm" },
  { day: "Wednesday", time: "9am–5pm" },
  { day: "Thursday", time: "9am–5pm" },
  { day: "Friday", time: "9am–5pm" },
  { day: "Saturday", time: "9am–5pm" },
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
              { label: "Engraved Cups", href: "/products/engraved-cups" },
              { label: "Signage Calculator", href: "/signage-quotes" },
            ]}
          />

          {/* Company */}
          <FooterColumn
            title="Company"
            items={[{ label: "About Us", href: "/about" }]}
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
                Hours <span className="text-foreground-muted">(Eastern Time)</span>
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
                href="https://www.facebook.com/share/1D34YQAGuE/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground hover:bg-white/5"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15h-2.5v-3H10V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/print_laser_stitch"
                target="_blank"
                rel="noopener noreferrer"
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
                href="https://yelp.to/v94oy-jn5w"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Yelp"
                className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground hover:bg-white/5"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M20.16 12.59L15.91 14c-.79.27-1.61-.34-1.61-1.17V3.06c0-.59.43-1.09 1.01-1.18C17.39 1.55 19.81 3.5 20.6 6.16c.27 1.4.27 4.55-.44 6.43zM12.5 14.78v6.95c0 .81-.82 1.39-1.59 1.13l-3.55-1.18c-.66-.22-.92-1.06-.49-1.6l4.21-5.78c.46-.6 1.42-.27 1.42.48zm-6.85-3.42l3.74 1.27c.69.23.83 1.13.24 1.59l-3.7 2.89c-.5.39-1.24.15-1.42-.46-.59-2.01-.59-3.95.18-5.04.2-.28.59-.36.96-.25zm14.94 6.18l-3.42-2.18c-.61-.39-.41-1.36.29-1.5l3.9-.78c.6-.12 1.14.32 1.14.92.04 1.4-.5 2.85-1.18 3.84-.25.36-.81.04-.73-.3zm-7.59-9.05V2.62c0-.59-.46-1.04-1.04-1.07-2.46-.04-4.95.79-5.6 2.29-.21.49.04 1.05.55 1.27l5.07 2.06c.61.25 1.02-.15 1.02-.68z" />
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
