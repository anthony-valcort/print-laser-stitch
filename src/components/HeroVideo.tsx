"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const VIDEO_ID = "zXI3TVYZZOM";
const SRC =
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
  `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}` +
  `&playsinline=1&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0`;

/**
 * Looping, muted, vertical hero video. Looks like a plain video: no controls,
 * no play button. The photo shows first (and stays for visitors who prefer
 * reduced motion), then the video fades in once it is really playing.
 */
export default function HeroVideo() {
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Let the page paint first so the video never slows the first view.
    const t = setTimeout(() => setMount(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="group relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#d9f000]/30 bg-black shadow-2xl shadow-[#d9f000]/20">
      <Image
        src="/Hero.jpeg"
        alt="Print Laser Stitch — printing, embroidery, vehicle wraps, apparel and engraving samples"
        fill
        sizes="(min-width: 1024px) 340px, 78vw"
        className="object-cover"
        priority
      />
      {mount && (
        <iframe
          src={SRC}
          title="Print Laser Stitch — everything we make"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setTimeout(() => setReady(true), 4200)}
          className={`pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 scale-[1.03] border-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          style={{ aspectRatio: "16 / 9", width: "auto" }}
        />
      )}
      {/* Light sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
    </div>
  );
}
