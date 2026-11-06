import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Mascot from "@/components/Mascot";

export const metadata: Metadata = {
  title: "Page not found | Print Laser Stitch",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-20">
          <Mascot
            pose="welcome"
            alt="Anthony from Print Laser Stitch welcoming you"
            className="w-40 sm:w-52"
            sizes="208px"
            priority
          />
          <p className="mt-6 font-headline text-xs font-semibold uppercase tracking-[0.2em] text-[#18d3e8]">
            Error 404
          </p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
            This page wandered off
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-foreground-muted sm:text-lg">
            No worries, it happens. Let&apos;s get you back to something
            great.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="accent-gradient rounded-full px-6 py-3 text-sm font-bold text-black shadow-lg shadow-[#d9f000]/20 transition-transform hover:scale-[1.03]"
            >
              Back to home
            </Link>
            <Link
              href="/collections"
              className="rounded-full border border-border-soft bg-white/5 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Browse products
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
