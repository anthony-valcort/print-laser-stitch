/**
 * Line icons for the header's category strip. Drawn on a 32px grid with a
 * 1.7 stroke so they stay crisp at the sizes the strip uses and pick up the
 * surrounding text colour (so hover/active states just change `color`).
 */

export type CategoryIconName =
  | "stickers"
  | "tshirts"
  | "polos"
  | "cards"
  | "flyers"
  | "posters"
  | "banners"
  | "signs"
  | "engraving"
  | "all";

export default function CategoryIcon({
  name,
  className = "h-7 w-7",
}: {
  name: CategoryIconName;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "stickers":
      return (
        <svg {...common}>
          <path d="M7 5h18a2 2 0 0 1 2 2v12l-8 8H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M27 19h-6a2 2 0 0 0-2 2v6" />
          <path d="m12 14 2.2 2.2L19 11.5" />
        </svg>
      );
    case "tshirts":
      return (
        <svg {...common}>
          <path d="m11 4-7 4 3 6 3-1.5V27h12V12.5l3 1.5 3-6-7-4c-.6 2-2.2 3.2-5 3.2S11.6 6 11 4Z" />
        </svg>
      );
    case "polos":
      return (
        <svg {...common}>
          <path d="m11 4-7 4 3 6 3-1.5V27h12V12.5l3 1.5 3-6-7-4" />
          <path d="m11 4 5 6 5-6" />
          <path d="M16 10v7" />
          <circle cx="16" cy="13.2" r=".5" fill="currentColor" />
          <circle cx="16" cy="16.2" r=".5" fill="currentColor" />
        </svg>
      );
    case "cards":
      return (
        <svg {...common}>
          <rect x="3.5" y="8" width="25" height="16" rx="2.5" />
          <path d="M8 13.5h8M8 17h5" />
          <circle cx="22.5" cy="15.5" r="2.4" />
        </svg>
      );
    case "flyers":
      return (
        <svg {...common}>
          <path d="M9 4h10l6 6v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M19 4v6h6" />
          <path d="M11.5 15h9M11.5 19h9M11.5 23h5" />
        </svg>
      );
    case "posters":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="22" height="24" rx="2" />
          <circle cx="12" cy="11.5" r="2" />
          <path d="m5 22 6.5-6 5 4.5 3.5-3L27 23" />
        </svg>
      );
    case "banners":
      return (
        <svg {...common}>
          <path d="M4 5h24" />
          <path d="M6 5v22M26 5v22" />
          <path d="M6 8h20v11H6" />
          <path d="m11 13.5 3 2.5 5-5" />
        </svg>
      );
    case "signs":
      return (
        <svg {...common}>
          <rect x="4.5" y="5" width="23" height="13" rx="2" />
          <path d="M16 18v9M11 27h10" />
          <path d="M9.5 10h13M9.5 13.5h8" />
        </svg>
      );
    case "engraving":
      return (
        <svg {...common}>
          <path d="M8 6h13l-1.4 18.2a2 2 0 0 1-2 1.8h-5.2a2 2 0 0 1-2-1.8L8 6Z" />
          <path d="M21 9h2.5a2.5 2.5 0 0 1 0 5H20.6" />
          <path d="m13 12 1.1 2.4 2.4 1.1-2.4 1.1L13 19l-1.1-2.4-2.4-1.1 2.4-1.1L13 12Z" />
        </svg>
      );
    case "all":
    default:
      return (
        <svg {...common}>
          <rect x="5" y="5" width="9" height="9" rx="2" />
          <rect x="18" y="5" width="9" height="9" rx="2" />
          <rect x="5" y="18" width="9" height="9" rx="2" />
          <path d="M22.5 18v9M18 22.5h9" />
        </svg>
      );
  }
}
