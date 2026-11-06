"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Anthony, the clickable mascot. Before a tap he greets you with a line that
 * fits the page and wiggles for attention. After a tap he cycles through
 * other lines, and the "call me" line keeps coming back.
 * <AnthonyBuddy /> (in the layout) peeks in on most pages; <TalkingAnthony />
 * is the same guy placed inline in a section.
 */
const PHONE_HREF = "tel:+17729852854";
const PHONE_LABEL = "(772) 985-2854";

const POSES = {
  welcome: "/mascot/anthony-hat-welcome.png",
  thumbs: "/mascot/anthony-hat-thumbs.png",
} as const;
type Pose = keyof typeof POSES;

const CALL_LINE = "You can call me now for all your print needs!";

type Msgs = { greet: string; lines: string[] };

const HOME: Msgs = {
  greet: "Welcome! Need any help? 👋",
  lines: [
    CALL_LINE,
    "Every order gets a free design proof before we print anything.",
    "Bulk orders are my favorite. Ask me about team uniforms!",
    "Proudly printed right here in Stuart, Florida. 🌴",
  ],
};
const APPAREL: Msgs = {
  greet: "This is our apparel page. Hope you love our selection! 👕",
  lines: [
    "We can’t wait to work on your next project!",
    "Outfitting a whole team? Ask me about bulk pricing! 🧢",
    "Tees, polos, hats... we put your logo on all of it.",
  ],
};
const CARDS: Msgs = {
  greet: "Did you know we offer free graphic design? Complimentary to you! 🎨",
  lines: [
    "Seriously, it’s on the house. Send me your idea!",
    "Sharp cards make a sharp first impression. 😎",
  ],
};
const CART: Msgs = {
  greet: "Hey, we made it to the cart! Can’t wait to start working with you 🎉",
  lines: [
    "Got questions? Call me, I’m happy to help!",
    "Every order gets a free design proof first. No surprises. 🙌",
  ],
};
const POSTERS: Msgs = {
  greet: "Our printers have the best colors on the market. The quality is out of this world! 🚀",
  lines: [
    "Colors so bright they jump right off the page!",
    "Big, bold and beautiful. That’s the plan. 🖼️",
  ],
};
const ENGRAVE: Msgs = {
  greet: "Let’s engrave some cool stuff today! 🔥",
  lines: [
    "Wood, metal, glass... bring me your wild ideas!",
    "Gifts, tumblers, plaques. Let’s make it personal. ✨",
  ],
};
const STICKERS: Msgs = {
  greet: "Sticker time! You dream it up, I’ll print it. 😎",
  lines: [
    "Every sticker gets laminated for max durability. 💪",
    "Any shape, any size. Let’s get creative!",
  ],
};
const SIGNS: Msgs = {
  greet: "Let’s make your business impossible to miss! 🚨",
  lines: [
    "Signs, banners, decals, flyers. I’ve got you covered!",
    "Big, bold and seen from down the road. 👀",
  ],
};
const VEHICLE: Msgs = {
  greet: "Let’s turn your ride into a rolling billboard! 🚐",
  lines: [
    "Every mile is free advertising. Let’s do it!",
    "Cars, vans, trucks. Bring it by!",
  ],
};
const CONTACT: Msgs = {
  greet: "Got a question? Send it my way! 💬",
  lines: [
    "Calling is fastest. I’m friendly, promise!",
    "No question is too small. Ask away!",
  ],
};
const GALLERY: Msgs = {
  greet: "Check out our work. Yours could be next! ✨",
  lines: [
    "Everything here was made right in Stuart, FL.",
    "See something you love? Let’s make one for you!",
  ],
};
const DEFAULT: Msgs = {
  greet: "Need a hand? Just tap me! 👋",
  lines: [
    CALL_LINE,
    "Every order gets a free design proof before we print anything.",
    "Proudly printed right here in Stuart, Florida. 🌴",
  ],
};

function messagesFor(p: string): Msgs {
  if (p === "/cart") return CART;
  if (/business-card/.test(p)) return CARDS;
  if (/engrav/.test(p)) return ENGRAVE;
  if (/poster/.test(p)) return POSTERS;
  if (/vehicle/.test(p)) return VEHICLE;
  if (/sticker|decal/.test(p)) return STICKERS;
  if (/banner|sign|flyer/.test(p)) return SIGNS;
  if (/shirt|polo|apparel|hoodie|richardson|5-panel|trucker|beanie/.test(p)) return APPAREL;
  if (p.startsWith("/contact")) return CONTACT;
  if (p.startsWith("/gallery")) return GALLERY;
  return DEFAULT;
}

/** Their lines, with the "call me" line sprinkled back in. */
function sequence(lines: string[]) {
  const out = lines.flatMap((l, i) => (i % 2 === 1 ? [l, CALL_LINE] : [l]));
  if (out[out.length - 1] !== CALL_LINE) out.push(CALL_LINE);
  return out;
}

type Align = "left" | "right" | "center";

export default function TalkingAnthony({
  pose,
  className = "",
  clip = false,
  intro = false,
  introKey = "home",
  greet = HOME.greet,
  lines = HOME.lines,
  align = "right",
  sizes = "240px",
  onHide,
}: {
  pose: Pose;
  className?: string;
  /** Show only the top two thirds so he looks like he is peeking in. */
  clip?: boolean;
  /** Greet by himself (once per page per visit) and wiggle for attention. */
  intro?: boolean;
  introKey?: string;
  greet?: string;
  lines?: string[];
  align?: Align;
  sizes?: string;
  onHide?: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [tip, setTip] = useState(false);
  const [hop, setHop] = useState(0);
  const clicks = useRef(0);
  const seq = sequence(lines);

  useEffect(() => {
    if (!intro) return;
    let greeted = true;
    try {
      const k = "anthony-hi:" + introKey;
      greeted = !!sessionStorage.getItem(k);
      if (!greeted) sessionStorage.setItem(k, "1");
    } catch {
      /* ignore */
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!greeted) {
      timers.push(setTimeout(() => clicks.current === 0 && setTip(true), 1200));
      timers.push(setTimeout(() => setTip(false), 10500));
    }
    // A little wiggle now and then until somebody taps him.
    let n = 0;
    const wiggle = setInterval(() => {
      if (clicks.current > 0 || n >= 3) {
        clearInterval(wiggle);
        return;
      }
      n++;
      setHop((h) => h + 1);
    }, 9000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(wiggle);
    };
  }, [intro, introKey]);

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
    setMsg(seq[n % seq.length]);
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
          {msg !== null ? (
            <div
              key={msg}
              className="animate-bubble-pop pointer-events-auto relative rounded-2xl bg-white p-3 text-black shadow-xl shadow-black/40"
            >
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
              <span
                aria-hidden
                className={"absolute -bottom-1.5 h-3 w-3 rotate-45 bg-white " + tail}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onClick}
              className="animate-bubble-pop pointer-events-auto relative rounded-2xl bg-white px-3 py-2 text-left text-[13px] font-bold leading-snug text-black shadow-xl shadow-black/40"
            >
              {greet}
              <span className="mt-0.5 block text-[10px] font-semibold text-black/45">tap me 👆</span>
              <span
                aria-hidden
                className={"absolute -bottom-1.5 h-3 w-3 rotate-45 bg-white " + tail}
              />
            </button>
          )}
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

// Checkout and account pages stay clear so nothing gets in the way of buying.
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
];
// These pages already have him in a section of their own.
const INLINE_ON = ["/", "/about"];
const SIDE: Record<string, "left" | "right"> = {
  contact: "left",
  gallery: "right",
  collections: "right",
  products: "left",
  blog: "left",
  cart: "right",
};

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Peeks in from the edge of most pages, from a different side per page. */
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
  const m = messagesFor(pathname);

  return (
    <TalkingAnthony
      key={pathname}
      pose={pose}
      clip
      intro
      introKey={pathname}
      greet={m.greet}
      lines={m.lines}
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
