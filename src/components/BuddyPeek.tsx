"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mascots pop in on every page, stay ~10s, slide away, then peek back for a
 * few seconds every ~75s. Tapping one keeps it around longer.
 */
const SHOW_MS = 10000;
const AWAY_MS = 75000;
const PEEK_MS = 7000;
const TOUCH_MS = 25000;

export default function BuddyPeek() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const set = (on: boolean) => {
      if (on) root.removeAttribute("data-peek");
      else root.setAttribute("data-peek", "off");
    };
    const hideThenReturn = (after: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        set(false);
        timer = setTimeout(() => {
          set(true);
          hideThenReturn(PEEK_MS);
        }, AWAY_MS);
      }, after);
    };
    set(true);
    hideThenReturn(SHOW_MS);
    const onDown = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.(".buddy-peek")) {
        set(true);
        hideThenReturn(TOUCH_MS);
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", onDown, true);
      set(true);
    };
  }, [pathname]);
  return (
    <style>{`.buddy-peek{transition:transform .6s cubic-bezier(.3,1.3,.5,1),opacity .4s}html[data-peek="off"] .buddy-peek{transform:translateY(135%);opacity:0;pointer-events:none}`}</style>
  );
}
