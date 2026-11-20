"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-store";
import type { PortalCartItem } from "@/lib/cart-types";
import {
  PORTAL_MAX_QTY,
  quotePortalLine,
  unitPriceFor,
  type PortalProduct,
} from "@/lib/portal-pricing";

type Company = {
  id: string;
  name: string;
  logoUrl: string;
  welcome: string;
  products: PortalProduct[];
};

const CSS = `
@keyframes pc-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes pc-pop{0%{transform:scale(.9);opacity:.5}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
.pc-card{animation:pc-up .5s cubic-bezier(.2,.8,.2,1) both;transition:transform .2s ease,box-shadow .2s ease}
.pc-card:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(0,0,0,.35)}
.pc-img{transition:transform .5s ease}
.pc-card:hover .pc-img{transform:scale(1.04)}
.pc-pop{animation:pc-pop .35s ease both}
@media (prefers-reduced-motion:reduce){.pc-card,.pc-pop{animation:none}.pc-card,.pc-img{transition:none}}
`;

const money = (n: number) => `$${n.toFixed(2)}`;

export default function PortalCatalog({ company }: { company: Company }) {
  const router = useRouter();
  const products = company.products.filter((p) => p.active);
  const cats = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products],
  );
  const [cat, setCat] = useState("");
  const shown = cat ? products.filter((p) => p.category === cat) : products;

  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <style>{CSS}</style>

      <header className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl border border-border-soft bg-white/4 p-5">
        {company.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={company.name}
            className="h-16 w-auto max-w-[160px] rounded-lg bg-white/90 object-contain p-1.5"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
            Your reorder portal
          </p>
          <h1 className="font-headline text-2xl font-bold sm:text-3xl">
            {company.name}
          </h1>
          <p className="text-sm text-foreground-muted">
            {company.welcome ||
              "Your logo and your products are already set up. Pick a quantity and reorder."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/cart"
            className="rounded-md border border-border-strong bg-white/5 px-4 py-2 font-headline text-xs font-bold uppercase tracking-wider hover:bg-white/10"
          >
            🛒 Cart
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md px-3 py-2 text-xs text-foreground-muted hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      {cats.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {["", ...cats].map((c) => (
            <button
              key={c || "all"}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                cat === c
                  ? "border-accent bg-accent text-black"
                  : "border-border-soft bg-white/4 hover:bg-white/8"
              }`}
            >
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="rounded-2xl border border-border-soft bg-white/4 p-8 text-center text-foreground-muted">
          We&apos;re still setting up your products. Call (772) 985-2854.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <ProductCard key={p.id} p={p} company={company} delay={i * 60} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-foreground-muted">
        Prices are your company&apos;s prices. Tax is added in the total. Need
        something new? Call (772) 985-2854.
      </p>
    </section>
  );
}

function ProductCard({
  p,
  company,
  delay,
}: {
  p: PortalProduct;
  company: Company;
  delay: number;
}) {
  const { addItem } = useCart();
  const sized = p.sizes.length > 0;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState("");

  const total = Object.values(qty).reduce((a, b) => a + (b || 0), 0);
  const quote = useMemo(() => quotePortalLine(p, qty), [p, qty]);
  const tiers = [...p.tiers].sort((a, b) => a.minQty - b.minQty);
  const nextTier = tiers.find((t) => t.minQty > total) ?? null;
  const unitNow = total > 0 ? unitPriceFor(p, total) : p.price;

  function setQ(key: string, v: number) {
    setAdded(false);
    setErr("");
    setQty((q) => ({
      ...q,
      [key]: Math.max(0, Math.min(PORTAL_MAX_QTY, Math.floor(v) || 0)),
    }));
  }

  function add() {
    if (!quote.ok) {
      setErr(quote.error ?? "Pick a quantity.");
      return;
    }
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(qty)) if (v > 0) clean[k] = v;
    const item: Omit<PortalCartItem, "id" | "addedAt"> = {
      kind: "portal",
      companyId: company.id,
      productId: p.id,
      qtyBySize: clean,
      title: `${company.name} · ${p.name}`,
      subtitle: sized
        ? quote.lines.map((l) => `${l.label} ×${l.qty}`).join(", ")
        : `${quote.totalQty} pcs`,
      thumbnail: p.imageUrl || "📦",
      unitLabel: `${money(quote.unit)} each`,
      totalPrice: quote.total,
      quantity: quote.totalQty,
      editHref: window.location.pathname,
    };
    addItem(item);
    setAdded(true);
    setQty({});
  }

  return (
    <article
      className="pc-card flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-white/4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative aspect-square overflow-hidden bg-white/90">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={`${p.name} with your logo`}
            className="pc-img h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-6xl">📦</div>
        )}
        {p.category && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
            {p.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-headline text-lg font-bold">{p.name}</h2>
        {p.description && (
          <p className="mt-0.5 text-xs text-foreground-muted">{p.description}</p>
        )}
        <p className="mt-2 text-xl font-black text-cyan-300">
          {money(unitNow)}{" "}
          <span className="text-xs font-semibold text-foreground-muted">each</span>
        </p>
        {tiers.length > 0 && (
          <p className="mt-1 text-[11px] text-emerald-300">
            {tiers.map((t) => `${t.minQty}+ ${money(t.price)}`).join(" · ")}
          </p>
        )}
        {p.note && <p className="mt-1 text-[11px] text-amber-200">{p.note}</p>}

        <div className="mt-3">
          {sized ? (
            <div className="grid grid-cols-4 gap-1.5">
              {p.sizes.map((sz) => (
                <label key={sz} className="block text-center">
                  <span className="block text-[11px] font-bold">
                    {sz}
                    {p.upcharge[sz] ? (
                      <span className="text-amber-300"> +{money(p.upcharge[sz])}</span>
                    ) : null}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={qty[sz] || ""}
                    placeholder="0"
                    onChange={(e) => setQ(sz, Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-border-soft bg-white/5 px-1 py-2 text-center text-sm font-bold tabular-nums outline-none ring-accent/40 focus:ring-2"
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-xl border border-border-soft bg-background/60 p-1">
              <button
                type="button"
                aria-label="Less"
                onClick={() => setQ("", (qty[""] || 0) - 1)}
                className="grid h-10 w-10 place-items-center rounded-lg text-lg font-bold hover:bg-white/10"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={qty[""] || ""}
                placeholder={p.minQty > 1 ? String(p.minQty) : "0"}
                onChange={(e) => setQ("", Number(e.target.value))}
                className="min-w-0 flex-1 bg-transparent text-center text-base font-bold tabular-nums outline-none"
              />
              <button
                type="button"
                aria-label="More"
                onClick={() =>
                  setQ("", (qty[""] || 0) === 0 ? p.minQty : (qty[""] || 0) + 1)
                }
                className="grid h-10 w-10 place-items-center rounded-lg text-lg font-bold hover:bg-white/10"
              >
                +
              </button>
            </div>
          )}
          {p.minQty > 1 && (
            <p className="mt-1 text-[11px] text-foreground-muted">
              Minimum {p.minQty}
            </p>
          )}
        </div>

        {nextTier && total > 0 && (
          <p className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-200">
            Add {nextTier.minQty - total} more to pay {money(nextTier.price)} each.
          </p>
        )}

        <div className="mt-auto pt-3">
          {quote.ok && (
            <div key={quote.total} className="pc-pop mb-2 flex items-end justify-between text-sm">
              <span className="text-foreground-muted">
                {quote.totalQty} pcs · tax {money(quote.tax)}
              </span>
              <span className="font-mono text-lg font-black text-highlight">
                {money(quote.total)}
              </span>
            </div>
          )}
          {err && <p className="mb-2 text-xs text-amber-300">{err}</p>}
          {added ? (
            <Link
              href="/cart"
              className="pc-pop block w-full rounded-md bg-emerald-400 px-4 py-3 text-center font-headline text-sm font-bold uppercase tracking-wider text-black"
            >
              ✓ Added. Go to cart
            </Link>
          ) : (
            <button
              type="button"
              onClick={add}
              className="w-full rounded-md accent-gradient px-4 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black transition hover:brightness-110"
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
