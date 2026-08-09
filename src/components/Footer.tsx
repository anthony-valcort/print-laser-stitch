import Image from "next/image";
import Link from "next/link";

const HOURS: { day: string; time: string }[] = [
  { day: "Mon", time: "7:30am–5:30pm" },
  { day: "Tue", time: "7:30am–5:30pm" },
  { day: "Wed", time: "7:30am–5:30pm" },
  { day: "Thu", time: "7:30am–5:30pm" },
  { day: "Fri", time: "7:30am–5:30pm" },
  { day: "Sat", time: "10am–1:30pm" },
  { day: "Sun", time: "Closed" },
];

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1D34YQAGuE/?mibextid=wwXIfr",
    path: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15h-2.5v-3H10V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z",
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-border-soft bg-background">
      {/* Neon hairline + ambient orbs to match the rest of the site */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#18d3e8]/60 to-transparent" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#d94cb3]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#18d3e8]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.avif"
                alt="Print Laser Stitch"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="font-display text-lg font-black uppercase tracking-tight">
                Print Laser{" "}
                <span className="accent-gradient-text">Stitch</span>
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-foreground-muted">
              We print, engrave and stitch — custom prints, apparel and
              signage delivered as fast as humanly possible.
            </p>

            <Link
              href="/collections"
              className="mt-6 inline-flex items-center gap-2 rounded-md accent-gradient px-5 py-2.5 font-headline text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110"
            >
              Start your order
              <Arrow />
            </Link>

            <div className="mt-7 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground-muted transition hover:border-[#18d3e8]/50 hover:text-[#18d3e8]"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
              <a
                href="https://www.instagram.com/print_laser_stitch"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground-muted transition hover:border-[#d94cb3]/50 hover:text-[#d94cb3]"
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
                className="grid h-9 w-9 place-items-center rounded-full border border-border-soft text-foreground-muted transition hover:border-[#d9f000]/50 hover:text-[#d9f000]"
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

          {/* Explore */}
          <FooterColumn
            className="lg:col-span-2"
            title="Explore"
            items={[
              { label: "Home", href: "/" },
              { label: "All Products", href: "/collections" },
              { label: "Signage Quote", href: "/decal-quote" },
              { label: "Decal Calculator", href: "/signage-quotes" },
              { label: "Blog", href: "/blog" },
              { label: "About Us", href: "/about" },
            ]}
          />

          {/* Account */}
          <FooterColumn
            className="lg:col-span-2"
            title="Account"
            items={[
              { label: "Log in", href: "/login" },
              { label: "Sign up", href: "/signup" },
              { label: "My Orders", href: "/account/orders" },
              {
                label: "Customer Portal",
                href: "https://printlaserstitch.app/",
                external: true,
              },
            ]}
          />

          {/* Hours + contact */}
          <div className="lg:col-span-4">
            <div className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              Hours{" "}
              <span className="text-foreground-muted">(Eastern Time)</span>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:max-w-xs">
              {HOURS.map((h) => (
                <li
                  key={h.day}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-foreground-muted">{h.day}</span>
                  <span
                    className={
                      h.time === "Closed"
                        ? "text-foreground-muted/50"
                        : "font-medium text-foreground/90"
                    }
                  >
                    {h.time}
                  </span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:info@printlaserstitch.com"
              className="mt-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition hover:text-[#18d3e8]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              info@printlaserstitch.com
            </a>
            <a
              href="tel:+17729852854"
              className="mt-3 flex items-center gap-2 text-sm text-foreground-muted transition hover:text-[#18d3e8]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
              </svg>
              (772) 985-2854
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=3141+SE+Dominica+Terrace%2C+Stuart%2C+FL+34997"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-start gap-2 text-sm text-foreground-muted transition hover:text-[#18d3e8]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0"
              >
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>3141 SE Dominica Terrace, Stuart, FL 34997</span>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border-soft pt-6 text-xs text-foreground-muted sm:flex-row">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>© {new Date().getFullYear()} Print Laser Stitch</span>
            <Link href="#" className="transition hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="transition hover:text-foreground">
              Cookies
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Crafted with</span>
            <span className="text-[#d94cb3]">♥</span>
            <span>by Print Laser Stitch</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Arrow() {
  return (
    <svg
      width="14"
      height="14"
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
  );
}

function FooterColumn({
  title,
  items,
  className = "",
}: {
  title: string;
  items: { label: string; href: string; external?: boolean }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-foreground">
        {title}
      </div>
      <ul className="mt-4 space-y-2.5 text-sm text-foreground-muted">
        {items.map((item) =>
          item.external ? (
            <li key={item.label}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-[#18d3e8]"
              >
                {item.label}
              </a>
            </li>
          ) : (
            <li key={item.label}>
              <Link
                href={item.href}
                className="transition hover:text-[#18d3e8]"
              >
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
