import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ShopifyCollectionSummary } from "@/lib/shopify-collections";

/**
 * Category banner color themes — light pastel cards per the client-approved
 * mockups (distinct from the site's dark neon palette by design). Matched by
 * Shopify collection handle where the client specified one; any collection
 * without a handle match cycles through the same theme set as a fallback so
 * new/renamed Shopify collections still render on-brand.
 */
type CategoryTheme = {
  base: string;
  diagonal: string;
  heading: string;
  desc: string;
};

const CATEGORY_THEMES: CategoryTheme[] = [
  {
    base: "bg-[#ddd0ab]",
    diagonal: "bg-[#c7a978]",
    heading: "text-[#5c4023]",
    desc: "text-[#6b5538]",
  },
  {
    base: "bg-[#d7edad]",
    diagonal: "bg-[#a9d97e]",
    heading: "text-[#1f5c2e]",
    desc: "text-[#2e6b3e]",
  },
  {
    base: "bg-[#9adfc4]",
    diagonal: "bg-[#5fae8d]",
    heading: "text-[#1c6b52]",
    desc: "text-[#256b52]",
  },
  {
    base: "bg-[#b7a4e0]",
    diagonal: "bg-[#9580c9]",
    heading: "text-[#3d2a63]",
    desc: "text-[#4a3a7a]",
  },
  {
    base: "bg-[#a6bce8]",
    diagonal: "bg-[#7e97d6]",
    heading: "text-[#274070]",
    desc: "text-[#33487a]",
  },
  {
    base: "bg-[#ecdca0]",
    diagonal: "bg-[#e0a35c]",
    heading: "text-[#8a5222]",
    desc: "text-[#8a5a2a]",
  },
  {
    base: "bg-[#f0a8ba]",
    diagonal: "bg-[#d94066]",
    heading: "text-[#7a1f3a]",
    desc: "text-[#832945]",
  },
  {
    base: "bg-[#d6d6d6]",
    diagonal: "bg-[#a3a3a3]",
    heading: "text-[#2b2b2b]",
    desc: "text-[#3c3c3c]",
  },
  {
    base: "bg-[#8993d9]",
    diagonal: "bg-[#5c67b8]",
    heading: "text-[#232a54]",
    desc: "text-[#28305e]",
  },
];

const CATEGORY_THEME_BY_HANDLE: Record<string, CategoryTheme> = {
  "custom-hats": CATEGORY_THEMES[0],
  "custom-apparel": CATEGORY_THEMES[1],
  "stickers-labels": CATEGORY_THEMES[2],
  "signs-banners": CATEGORY_THEMES[3],
  "business-printing": CATEGORY_THEMES[4],
  "uv-printing": CATEGORY_THEMES[5],
  "laser-engraving": CATEGORY_THEMES[6],
  "vehicle-boat-graphics": CATEGORY_THEMES[8],
};

function themeForCategory(handle: string, index: number): CategoryTheme {
  return (
    CATEGORY_THEME_BY_HANDLE[handle] ??
    CATEGORY_THEMES[index % CATEGORY_THEMES.length]
  );
}

/**
 * Diagonal-split category banner grid — client-approved design, shared
 * between the homepage "Make your selection" section and /collections.
 * Images always come from the Shopify collection (`c.image.url`) so the
 * client can update them from Shopify admin without a code change.
 */
export default function CategoryGrid({
  categories,
}: {
  categories: ShopifyCollectionSummary[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      {categories.map((c, i) => {
        const theme = themeForCategory(c.handle, i);
        return (
          <Link
            key={c.id}
            href={`/collections/${c.handle}`}
            data-reveal="scale"
            style={
              { "--reveal-delay": `${(i % 2) * 90}ms` } as CSSProperties
            }
            className={`group relative isolate flex flex-col overflow-hidden rounded-2xl shadow-lg shadow-black/20 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 sm:min-h-46 sm:flex-row ${theme.base}`}
          >
            {/* Diagonal two-tone split — mirrors the client mockups */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${theme.diagonal}`}
              style={{
                clipPath: "polygon(38% 0, 100% 0, 100% 100%, 12% 100%)",
              }}
            />

            {/* Text side — below the image on phones, left on larger screens */}
            <div className="relative z-10 order-2 flex flex-1 flex-col justify-center gap-1.5 px-3 pb-3 pt-1 sm:order-none sm:max-w-[54%] sm:gap-2 sm:p-6">
              <h3
                title={c.title}
                className={`line-clamp-2 font-display text-[13px] font-black uppercase leading-[1.05] tracking-tight sm:line-clamp-none sm:text-2xl sm:leading-[0.95] ${theme.heading}`}
              >
                {c.title}
              </h3>
              {c.description && (
                <p
                  className={`hidden text-sm leading-relaxed sm:line-clamp-2 ${theme.desc}`}
                >
                  {c.description}
                </p>
              )}
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full shop-now-gradient px-3 py-1 font-headline text-[10px] font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/25 transition group-hover:brightness-110 sm:px-5 sm:py-2 sm:text-xs">
                Shop Now
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </div>

            {/* Image side — Shopify collection image, dynamic, transparent on the card color */}
            <div className="relative z-10 order-1 aspect-4/3 w-full sm:order-none sm:aspect-auto sm:w-auto sm:flex-1 sm:p-3">
              {c.image?.url ? (
                <Image
                  src={c.image.url}
                  alt={c.image.altText ?? c.title}
                  fill
                  sizes="(max-width: 640px) 46vw, 28vw"
                  className="object-contain object-center p-2 transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <span className="text-4xl drop-shadow-2xl sm:text-6xl">
                    🗂️
                  </span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
