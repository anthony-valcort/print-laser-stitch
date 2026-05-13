import Link from "next/link";

export default function AlreadyCustomerCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-surface px-6 py-10 text-center sm:px-10">
        {/* Decorative dots */}
        <span className="absolute left-4 top-4 h-2 w-2 rounded-full bg-highlight" />
        <span className="absolute right-4 top-6 h-2 w-2 rounded-full bg-blue-400" />
        <span className="absolute bottom-6 left-10 h-1.5 w-1.5 rounded-full bg-pink-400" />
        <span className="absolute bottom-4 right-12 h-2 w-2 rounded-full bg-emerald-400" />

        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Already a customer?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-foreground-muted">
          Quick login to track your orders, reorder favorites, and access
          exclusive customer perks.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md cyan-gradient px-6 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#18d3e8]/30 transition hover:brightness-110"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md accent-gradient px-6 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110"
          >
            New Customer? Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
}
