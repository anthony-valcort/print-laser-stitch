"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VIDEO_ID = "zXI3TVYZZOM";
const BASE =
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
  `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}` +
  `&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0`;

// The player is always rendered at a size YouTube accepts for autoplay
// (at least 200px), then scaled down to fit the small phone frame.
const PW = 480;
const PH = 270;

/**
 * Looping, muted, vertical hero video. Looks like a plain video: no controls,
 * no play button. Loads right away; the photo shows until the video is
 * really playing, then the video fades in.
 */
export default function HeroVideo() {
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");
  const [fit, setFit] = useState({ scale: 1, x: 0 });

  useEffect(() => {
    setSrc(`${BASE}&origin=${encodeURIComponent(window.location.origin)}`);
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const scale = (el.clientHeight / PH) * 1.03;
      setFit({ scale, x: (el.clientWidth - PW * scale) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Phones sometimes ignore the first start request: keep asking until playing.
  useEffect(() => {
    if (ready || !src) return;
    const t = setInterval(() => {
      const w = frame.current?.contentWindow;
      if (!w) return;
      w.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "mute", args: [] }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
    }, 1200);
    return () => clearInterval(t);
  }, [ready, src]);

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
    <div ref={box} className="group relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border border-[#d9f000]/30 bg-black shadow-2xl shadow-[#d9f000]/20">
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
      {src && (
        <iframe
          ref={frame}
          src={src}
          title="Print Laser Stitch — everything we make"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={start}
          className={`pointer-events-none absolute left-0 top-0 max-w-none origin-top-left border-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          style={{
            width: PW,
            height: PH,
            transform: `translateX(${fit.x}px) scale(${fit.scale})`,
          }}
        />
      )}
      {/* Light sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
    </div>
  );
}
