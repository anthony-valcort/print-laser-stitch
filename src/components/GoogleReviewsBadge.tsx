import { GOOGLE_REVIEWS } from "@/lib/reviews";

/** "5.0 ★★★★★ 117 Google reviews" — links to the live Google listing. */
export default function GoogleReviewsBadge({ className = "" }: { className?: string }) {
  const { rating, count, url } = GOOGLE_REVIEWS;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-1.5 text-xs text-foreground-muted transition hover:border-[#d9f000]/50 hover:text-foreground ${className}`}
    >
      <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
      <span aria-hidden className="tracking-tight text-[#d9f000]">
        ★★★★★
      </span>
      <span>
        {count} Google reviews
      </span>
    </a>
  );
}
