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
    <div className="grid gap-5 sm:grid-cols-2">
      {categories.map((c, i) => {
        const theme = themeForCategory(c.handle, i);
        return (
          <Link
            key={c.id}
            href={`/collections/${c.handle}`}
            className={`group relative isolate flex min-h-40 flex-row overflow-hidden rounded-2xl shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 sm:min-h-46 ${theme.base}`}
          >
            {/* Diagonal two-tone split — mirrors the client mockups */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${theme.diagonal}`}
              style={{
                clipPath: "polygon(38% 0, 100% 0, 100% 100%, 12% 100%)",
              }}
            />

            {/* Text side */}
            <div className="relative z-10 flex max-w-[54%] flex-1 flex-col justify-center gap-1.5 p-4 sm:gap-2 sm:p-6">
              <h3
                className={`font-display text-lg font-black uppercase leading-[0.95] tracking-tight sm:text-2xl ${theme.heading}`}
              >
                {c.title}
              </h3>
              {c.description && (
                <p
                  className={`line-clamp-2 text-[11px] leading-relaxed sm:text-sm ${theme.desc}`}
                >
                  {c.description}
                </p>
              )}
              <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full shop-now-gradient px-4 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/25 transition group-hover:brightness-110 sm:px-5 sm:py-2 sm:text-xs">
                Shop Now
              </span>
            </div>

            {/* Image side — Shopify collection image, dynamic, in a white rectangle tile */}
            <div className="relative z-10 flex-1 p-3">
              <div className="relative h-full w-full overflow-hidden rounded-xl bg-white/95">
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
            </div>
          </Link>
        );
      })}
    </div>
  );
}
