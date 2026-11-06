"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Anthony, the clickable mascot. Tap him and he tells you to call. Every tap
 * after that is a different friendly line. <AnthonyBuddy /> (in the layout)
 * peeks in from the edge of almost every page; <TalkingAnthony /> is the same
 * guy placed inline in a section.
 */
const PHONE_HREF = "tel:+17729852854";
const PHONE_LABEL = "(772) 985-2854";

const POSES = {
  welcome: "/mascot/anthony-hat-welcome.png",
  thumbs: "/mascot/anthony-hat-thumbs.png",
} as const;
type Pose = keyof typeof POSES;

const CALL_LINE = "You can call me now for all your print needs!";
const LINES = [
  CALL_LINE,
  "Shirts, stickers, signs, hats. If you can dream it, I can print it. 🧢",
  "Every order gets a free design proof before we print anything.",
  CALL_LINE,
  "Not happy with it? We will reprint it. No hassle.",
  "Bulk orders are my favorite. Ask me about team uniforms!",
  CALL_LINE,
  "Proudly printed right here in Stuart, Florida. 🌴",
];

type Align = "left" | "right" | "center";

export default function TalkingAnthony({
  pose,
  className = "",
  clip = false,
  intro = false,
  align = "right",
  sizes = "240px",
  onHide,
}: {
  pose: Pose;
  className?: string;
  /** Show only the top two thirds so he looks like he is peeking in. */
  clip?: boolean;
  /** Say hi by himself once per visit. */
  intro?: boolean;
  align?: Align;
  sizes?: string;
  onHide?: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [tip, setTip] = useState(false);
  const [hop, setHop] = useState(0);
  const clicks = useRef(0);

  useEffect(() => {
    if (!intro) return;
    try {
      if (sessionStorage.getItem("anthony-hi")) return;
      sessionStorage.setItem("anthony-hi", "1");
    } catch {
      return;
    }
    const on = setTimeout(() => setTip(true), 1500);
    const off = setTimeout(() => setTip(false), 8500);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [intro]);

  const close = useCallback(() => setMsg(null), []);

  useEffect(() => {
    if (msg === null) return;
    const t = setTimeout(close, 15000);
    return () => clearTimeout(t);
  }, [msg, close]);

  function onClick() {
    const n = clicks.current++;
    setTip(false);
    setHop((h) => h + 1);
    setMsg(LINES[n % LINES.length]);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* not supported */
    }
  }

  const pos = align === "left" ? "left-5" : align === "center" ? "left-1/2 -ml-30" : "right-5";
  const flex = align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";
  const tail = align === "left" ? "left-9" : align === "center" ? "left-1/2 -ml-1.5" : "right-9";

  return (
    <div className={(/\b(absolute|fixed)\b/.test(className) ? "" : "relative ") + className}>
      {(msg !== null || tip) && (
        <div
          className={"pointer-events-none absolute bottom-full z-20 mb-1 flex w-60 max-w-[80vw] " + pos + " " + flex}
        >
          <div
            key={msg ?? "tip"}
            className="animate-bubble-pop pointer-events-auto relative rounded-2xl bg-white p-3 text-black shadow-xl shadow-black/40"
          >
            {msg !== null ? (
              <>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-1.5 top-1 grid h-6 w-6 place-items-center rounded-full text-base leading-none text-black/50 hover:bg-black/5"
                >
                  ×
                </button>
                <p className="pr-5 text-[13px] font-semibold leading-snug">{msg}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <a
                    href={PHONE_HREF}
                    className="accent-gradient inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-black"
                  >
                    📞 Call now
                  </a>
                  <Link
                    href="/contact"
                    onClick={close}
                    className="rounded-full border border-black/15 px-3.5 py-2 text-xs font-semibold text-black hover:bg-black/5"
                  >
                    Message me
                  </Link>
                </div>
                <p className="mt-1.5 text-[11px] text-black/50">{PHONE_LABEL}</p>
                {onHide && (
                  <button
                    type="button"
                    onClick={onHide}
                    className="mt-1 text-[11px] text-black/45 underline"
                  >
                    Not now, hide me
                  </button>
                )}
              </>
            ) : (
              <p className="whitespace-nowrap text-xs font-bold">Hi, I&apos;m Anthony! Tap me 👋</p>
            )}
            <span
              aria-hidden
              className={"absolute -bottom-1.5 h-3 w-3 rotate-45 bg-white " + tail}
            />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label="Talk to Anthony"
        className="block w-full cursor-pointer select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#d9f000] [-webkit-tap-highlight-color:transparent]"
      >
        <span
          key={hop}
          className={"block " + (hop ? "animate-mascot-hop motion-reduce:animate-none" : "")}
        >
          <span
            className={clip ? "block overflow-hidden" : "block"}
            style={clip ? { aspectRatio: "1086 / 985" } : undefined}
          >
            <Image
              src={POSES[pose]}
              alt=""
              width={1086}
              height={1448}
              sizes={sizes}
              draggable={false}
              className="animate-mascot-sway h-auto w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)] motion-reduce:animate-none"
            />
          </span>
        </span>
      </button>
    </div>
  );
}

const HIDE_ON = [
  "/cart",
  "/order",
  "/account",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/activate",
  "/admin",
  "/mobile-proof",
  "/api",
];
// These pages already have him in a section of their own.
const INLINE_ON = ["/", "/about"];
const SIDE: Record<string, "left" | "right"> = {
  contact: "left",
  gallery: "right",
  collections: "right",
  products: "left",
  blog: "left",
};

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Peeks in from the edge of almost every page, from a different side per page. */
export function AnthonyBuddy() {
  const pathname = usePathname() || "/";
  const [hidden, setHidden] = useState(false);
  const [bar, setBar] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("anthony-hide") === "1") setHidden(true);
    } catch {
      /* ignore */
    }
  }, []);

  // On phones a sticky bar sits at the bottom of some pages; stand on top of it.
  useEffect(() => {
    const t = setTimeout(() => {
      const bars = document.querySelectorAll<HTMLElement>(".fixed.inset-x-0.bottom-0");
      setBar(Array.from(bars).some((e) => e.offsetHeight > 0));
    }, 500);
    return () => clearTimeout(t);
  }, [pathname]);

  const first = pathname.split("/")[1] ?? "";
  if (hidden || INLINE_ON.includes(pathname) || HIDE_ON.includes("/" + first)) {
    return null;
  }
  const side = SIDE[first] ?? (hash(first) % 2 ? "left" : "right");
  const pose: Pose = hash(pathname) % 2 ? "thumbs" : "welcome";

  return (
    <TalkingAnthony
      key={pathname}
      pose={pose}
      clip
      intro
      align={side}
      sizes="(min-width: 1024px) 256px, 224px"
      onHide={() => {
        try {
          sessionStorage.setItem("anthony-hide", "1");
        } catch {
          /* ignore */
        }
        setHidden(true);
      }}
      className={
        "fixed z-30 w-40 sm:bottom-0 sm:w-56 lg:w-64 " +
        (bar ? "bottom-[4.2rem] " : "bottom-0 ") +
        (side === "left" ? "-left-3 sm:left-2" : "-right-3 sm:right-2")
      }
    />
  );
}
