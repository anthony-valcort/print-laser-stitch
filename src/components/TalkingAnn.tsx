"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PHONE_HREF = "tel:+17729852854";
const PHONE_LABEL = "(772) 985-2854";

type Pose = "tees" | "stickers" | "embroidery" | "posters";

const POSES: Record<Pose, string> = {
  tees: "/mascot/ann-tees.png",
  stickers: "/mascot/ann-stickers.png",
  embroidery: "/mascot/ann-embroidery.png",
  posters: "/mascot/ann-posters.png",
};

const CALL_LINE = "I'd love to hear your idea! Call us anytime 💛";

type Msgs = { pose: Pose; greet: string; lines: string[] };

const APPAREL: Msgs = {
  pose: "tees",
  greet: "You've got great taste! Pick your favorites 💛",
  lines: [
    "Whatever you're picturing, we can make it real. You've got this!",
    "Big team order or just one tee? Both are a big yes here 🎉",
    "Your crew is going to look amazing. I just know it!",
  ],
};
const EMBROIDERY: Msgs = {
  pose: "embroidery",
  greet: "Stitched with love! Your logo will look amazing 🌺",
  lines: [
    "Hats and polos with your logo? That's how people remember you!",
    "Every stitch is done with care. We're so excited for your project!",
    "Don't worry if your logo isn't perfect. We'll help you shine ✨",
  ],
};
const STICKERS: Msgs = {
  pose: "stickers",
  greet: "Stickers and so much fun! What are we making? ✨",
  lines: [
    "Tiny things, big smiles. Let's make something you'll love!",
    "No idea is too silly. Tell us and we'll make it happen 💛",
    "You're going to love how these turn out!",
  ],
};
const POSTERS: Msgs = {
  pose: "posters",
  greet: "Big ideas deserve big prints. You've got this! 🖼️",
  lines: [
    "Cards, posters, signs... we'll make you look like the pro you are!",
    "Need a design? We'll help you every step of the way 💛",
    "Your business is going to stand out. I believe in you!",
  ],
};
const DEFAULT: Msgs = {
  pose: "tees",
  greet: "Hi, I'm Ann! So glad you're here 💛",
  lines: [
    "Whatever you're dreaming up, we'd love to help make it real!",
    "Take your time looking around. We're cheering you on!",
    "Every great project starts with one little idea. Share yours!",
  ],
};

function messagesFor(p: string): Msgs {
  const s = p.toLowerCase();
  if (/sticker|decal|dtf|transfer/.test(s)) return STICKERS;
  if (/poster|banner|flyer|business-card|card|sign|vehicle|engrav/.test(s)) return POSTERS;
  if (/polo|hat|cap|trucker|richardson|5-panel|beanie|embroider|vest/.test(s)) return EMBROIDERY;
  if (/shirt|tee|apparel|hoodie|collections|products/.test(s)) return APPAREL;
  return DEFAULT;
}

function sequence(lines: string[]): string[] {
  const out: string[] = [];
  lines.forEach((l, i) => {
    out.push(l);
    if (i % 2 === 1) out.push(CALL_LINE);
  });
  out.push(CALL_LINE);
  return out;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function TalkingAnn({
  pose = "tees",
  className = "",
  greet,
  lines,
  introKey,
  delay = 1800,
  compact = false,
  align = "right",
  sizes = "(min-width: 1024px) 256px, 176px",
  onHide,
}: {
  pose?: Pose;
  className?: string;
  greet?: string;
  lines?: string[];
  introKey?: string;
  delay?: number;
  compact?: boolean;
  align?: "left" | "right" | "center";
  sizes?: string;
  onHide?: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [hop, setHop] = useState(0);
  const clicks = useRef(0);
  const touched = useRef(false);
  const seq = useRef<string[]>(sequence(lines ?? DEFAULT.lines));
  seq.current = sequence(lines ?? DEFAULT.lines);

  useEffect(() => {
    if (!greet) return;
    let seen = false;
    const key = introKey ? `ann-hi:${introKey}` : null;
    try {
      if (key && sessionStorage.getItem(key)) seen = true;
    } catch {}
    if (seen) return;
    const t1 = setTimeout(() => {
      if (touched.current) return;
      setTip(greet);
      try {
        if (key) sessionStorage.setItem(key, "1");
      } catch {}
    }, delay);
    const t2 = setTimeout(() => setTip(null), delay + 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [greet, introKey, delay]);

  function tap() {
    touched.current = true;
    setTip(null);
    setHop((h) => h + 1);
    const list = seq.current;
    const next = clicks.current === 0 ? CALL_LINE : list[(clicks.current - 1) % list.length];
    clicks.current += 1;
    setMsg(next);
  }

  const alignCls =
    align === "left" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";

  const bubble = msg ? (
    <div
      role="dialog"
      aria-label="Message from Ann"
      className={`animate-bubble-pop absolute bottom-full z-20 mb-2 w-64 max-w-[78vw] rounded-2xl border border-[#d94cb3]/40 bg-[#14141c] p-3 text-left shadow-xl ${alignCls}`}
    >
      <button
        type="button"
        onClick={() => setMsg(null)}
        aria-label="Close"
        className="absolute right-2 top-1 text-lg leading-none text-white/60 hover:text-white"
      >
        ×
      </button>
      <p className="pr-5 text-sm font-medium leading-snug text-white">{msg}</p>
      <div className="mt-3 flex gap-2">
        <a
          href={PHONE_HREF}
          className="accent-gradient rounded-full px-3 py-1.5 text-xs font-bold text-black"
        >
          📞 Call now
        </a>
        <Link
          href="/contact"
          className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Message us
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-white/50">{PHONE_LABEL}</p>
      {onHide && (
        <button
          type="button"
          onClick={() => {
            setMsg(null);
            onHide();
          }}
          className="mt-1 text-[11px] text-white/50 underline"
        >
          Not now, hide me
        </button>
      )}
    </div>
  ) : null;

  const greetBubble =
    tip && !msg ? (
      <button
        type="button"
        onClick={tap}
        className={`animate-bubble-pop absolute bottom-full z-20 mb-2 w-52 max-w-[70vw] rounded-2xl border border-[#d94cb3]/40 bg-[#14141c] px-3 py-2 text-left text-sm font-medium text-white shadow-xl ${alignCls}`}
      >
        {tip}
        <span className="mt-1 block text-[11px] text-[#d94cb3]">tap me 👆</span>
      </button>
    ) : null;

  const src = POSES[pose];

  return (
    <div className={(/\b(absolute|fixed)\b/.test(className) ? "" : "relative ") + className}>
      {bubble}
      {greetBubble}
      <button
        type="button"
        onClick={tap}
        aria-label="Talk to Ann"
        className="block w-full cursor-pointer select-none"
      >
        <span key={hop} className="block animate-mascot-hop motion-reduce:animate-none">
          {compact ? (
            <>
              <span className="relative block h-16 w-16 overflow-hidden rounded-full border-2 border-[#d94cb3] bg-[#14141c] sm:hidden">
                <Image
                  src={src}
                  alt=""
                  width={1086}
                  height={1448}
                  sizes="220px"
                  className="absolute max-w-none"
                  style={{ width: 220, left: -78, top: -4 }}
                />
              </span>
              <span className="hidden sm:block">
                <Image
                  src={src}
                  alt="Ann Christie, the Print Laser Stitch mascot"
                  width={1086}
                  height={1448}
                  sizes={sizes}
                  className="animate-mascot-sway h-auto w-full motion-reduce:animate-none"
                />
              </span>
            </>
          ) : (
            <Image
              src={src}
              alt="Ann Christie, the Print Laser Stitch mascot"
              width={1086}
              height={1448}
              sizes={sizes}
              className="animate-mascot-sway h-auto w-full motion-reduce:animate-none"
            />
          )}
        </span>
      </button>
    </div>
  );
}

const HIDE_ON = [
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
  "/cart",
  "/contact",
  "/about",
];

export function AnnBuddy() {
  const pathname = usePathname() || "/";
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);
  const [bar, setBar] = useState(false);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem("ann-hide") === "1");
    } catch {}
    setGone(false);
    const check = () => {
      setGone(!!document.querySelector("[data-no-buddy]"));
      const b = document.querySelector(".fixed.inset-x-0.bottom-0") as HTMLElement | null;
      setBar(!!b && b.offsetHeight > 0);
    };
    const t = setTimeout(check, 400);
    const t2 = setTimeout(check, 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [pathname]);

  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  if (hidden || gone) return null;
  if (pathname === "/" || HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return null;

  const m = messagesFor(pathname);
  // Opposite side from Anthony: he uses SIDE or hash parity; mirror conservative defaults.
  const anthonySide: Record<string, "left" | "right"> = {
    contact: "left",
    gallery: "right",
    collections: "right",
    products: "left",
    blog: "left",
    cart: "right",
  };
  const aSide = anthonySide[first] ?? (hash(pathname) % 2 === 0 ? "left" : "right");
  const side = aSide === "left" ? "right" : "left";

  const bottom = bar ? "bottom-[5rem]" : "bottom-4";
  const sideCls = side === "left" ? "left-3 sm:left-2" : "right-3 sm:right-2";

  return (
    <TalkingAnn
      pose={m.pose}
      compact
      greet={m.greet}
      lines={m.lines}
      introKey={pathname}
      delay={11000}
      align={side === "left" ? "left" : "right"}
      className={`fixed z-30 w-16 sm:bottom-0 sm:w-52 lg:w-60 ${bottom} ${sideCls}`}
      onHide={() => {
        try {
          sessionStorage.setItem("ann-hide", "1");
        } catch {}
        setHidden(true);
      }}
    />
  );
}
