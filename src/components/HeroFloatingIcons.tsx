/**
 * Print/laser/stitch themed icons that drift gently behind the hero. Each icon
 * has its own animation timing so the motion stays organic. Positioned with
 * absolute coords inside a relatively-positioned hero parent.
 */
export default function HeroFloatingIcons() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden"
    >
      {/* Printer (top-left) */}
      <Icon
        className="absolute left-[6%] top-[18%] animate-icon-a text-[#d9f000]/45"
        size={56}
      >
        <rect x="6" y="9" width="12" height="7" rx="2" />
        <path d="M6 13H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </Icon>

      {/* Scissors (top-right) */}
      <Icon
        className="absolute right-[8%] top-[10%] animate-icon-b text-[#18d3e8]/45"
        size={52}
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </Icon>

      {/* T-shirt (mid-right) */}
      <Icon
        className="absolute right-[4%] top-[55%] animate-icon-c text-[#d94cb3]/45"
        size={60}
      >
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </Icon>

      {/* Palette (bottom-left) */}
      <Icon
        className="absolute left-[10%] bottom-[14%] animate-icon-d text-[#d9f000]/40"
        size={54}
      >
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </Icon>

      {/* Spray/sparkle (mid-left) */}
      <Icon
        className="absolute left-[28%] top-[60%] animate-icon-c text-[#18d3e8]/35"
        size={42}
      >
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
      </Icon>

      {/* Tag (bottom-right) */}
      <Icon
        className="absolute right-[22%] bottom-[8%] animate-icon-a text-[#d94cb3]/40"
        size={46}
      >
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </Icon>

      {/* Ruler (top-mid) */}
      <Icon
        className="absolute left-[45%] top-[8%] animate-icon-b text-[#d9f000]/30"
        size={44}
      >
        <path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z" />
        <path d="m7.5 4.5 3 3M5.5 6.5l3 3M9.5 2.5l3 3M11.5 8.5l3 3M13.5 6.5l3 3" />
      </Icon>
    </div>
  );
}

function Icon({
  className,
  size,
  children,
}: {
  className: string;
  size: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}
