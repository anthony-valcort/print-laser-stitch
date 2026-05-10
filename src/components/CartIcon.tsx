"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export default function CartIcon() {
  const { itemCount, isHydrated } = useCart();
  const showBadge = isHydrated && itemCount > 0;

  return (
    <Link
      href="/cart"
      aria-label={`Cart (${itemCount} items)`}
      className="relative rounded-full border border-border-soft bg-white/5 p-2 text-foreground hover:bg-white/10"
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
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {showBadge && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full accent-gradient px-1 text-[10px] font-bold text-white">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
