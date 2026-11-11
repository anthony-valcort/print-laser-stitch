"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VIDEO_ID = "zXI3TVYZZOM";
const SRC =
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
  `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}` +
  `&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0`;

/**
 * Looping, muted, vertical hero video. Looks like a plain video: no controls,
 * no play button. Loads right away; the photo shows until the video is
 * really playing, then the video fades in.
 */
export default function HeroVideo() {
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // YouTube tells us when the video is really playing (state 1). Show it
    // only then, so a phone that blocks autoplay never shows a stuck player.
    const onMessage = (e: MessageEvent) => {
      if (!String(e.origin).includes("youtube")) return;
      if (e.source !== frame.current?.contentWindow) return;
      let d: unknown = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      const m = d as { event?: string; info?: unknown };
      const playing =
        (m.event === "onStateChange" && m.info === 1) ||
        (m.event === "infoDelivery" &&
          (m.info as { playerState?: number } | undefined)?.playerState === 1);
      if (playing && !timer) timer = setTimeout(() => setReady(true), 900);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Ask the player to start (phones sometimes need a nudge after load).
  const start = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const send = (o: object) => w.postMessage(JSON.stringify(o), "*");
    send({ event: "listening", id: 1, channel: "widget" });
    send({ event: "command", func: "mute", args: [] });
    send({ event: "command", func: "playVideo", args: [] });
  };

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
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      <link rel="preconnect" href="https://i.ytimg.com" />
      <iframe
          ref={frame}
          src={SRC}
          title="Print Laser Stitch — everything we make"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={start}
          className={`pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 scale-[1.03] border-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          style={{ aspectRatio: "16 / 9", width: "auto" }}
        />
      {/* Light sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
    </div>
  );
}
