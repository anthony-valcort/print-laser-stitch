"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  info?: {
    contact: string;
    phone: string;
    email: string;
    shipTo: string;
    poNumber: string;
    notes: string;
  };
  requests?: {
    id: string;
    title: string;
    status: "new" | "quoted" | "done";
    createdAt: string;
  }[];
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

type Info = {
  contact: string;
  phone: string;
  email: string;
  shipTo: string;
  poNumber: string;
  notes: string;
};

const TABS = [
  { id: "mine", label: "My products", icon: "⭐" },
  { id: "orders", label: "My orders", icon: "📦" },
  { id: "shop", label: "Our products", icon: "🛍️" },
  { id: "ask", label: "Ask for something", icon: "💬" },
  { id: "info", label: "My info", icon: "📇" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const SHOP_LINKS = [
  { label: "T-Shirts & Apparel", href: "/collections/custom-apparel", icon: "👕" },
  { label: "Polos", href: "/products/embroidered-polos", icon: "👔" },
  { label: "Business Cards", href: "/products/business-cards", icon: "💳" },
  { label: "Flyers", href: "/products/flyers", icon: "📄" },
  { label: "Banners", href: "/products/banners", icon: "🚩" },
  { label: "Posters", href: "/products/posters", icon: "🖼️" },
  { label: "Stickers", href: "/products/vinyl-stickers", icon: "✨" },
  { label: "Signs & Decals", href: "/signage-quotes", icon: "🪧" },
  { label: "Engraving", href: "/products/engraved-cups", icon: "🔥" },
  { label: "Everything", href: "/collections", icon: "🧰" },
];

const inputCls =
  "w-full rounded-xl border border-border-soft bg-white/5 px-3 py-3 text-base outline-none ring-accent/40 focus:ring-2";

export default function PortalCatalog({ company }: { company: Company }) {
  const router = useRouter();
  const products = company.products.filter((p) => p.active);
  const cats = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products],
  );
  const [cat, setCat] = useState("");
  const [find, setFind] = useState("");
  const [tab, setTab] = useState<Tab>("mine");
  const f = find.trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (!cat || p.category === cat) &&
      (!f || p.name.toLowerCase().includes(f) || p.description.toLowerCase().includes(f)),
  );
  const who = company.info?.contact?.split(" ")[0] || "";

  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <style>{CSS}</style>

      <header className="relative mb-5 overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-accent/15 via-white/5 to-transparent p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          {company.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-16 w-auto max-w-[160px] rounded-xl bg-white/90 object-contain p-1.5 shadow-lg sm:h-20"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
              {who ? `Hi ${who} 👋` : "Welcome back 👋"}
            </p>
            <h1 className="font-headline text-2xl font-bold sm:text-4xl">
              {company.name}
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              {company.welcome || "Your products, your prices. Pick a number and reorder."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="rounded-xl border border-border-strong bg-white/5 px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-wider hover:bg-white/10"
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
        </div>
      </header>

      <nav
        aria-label="Portal sections"
        className="sticky top-0 z-20 -mx-4 mb-5 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0"
      >
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-bold transition ${
              tab === x.id
                ? "border-accent bg-accent text-black"
                : "border-border-soft bg-white/4 hover:bg-white/8"
            }`}
          >
            {x.icon} {x.label}
          </button>
        ))}
      </nav>

      {tab === "mine" && (
        <>
          {products.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="🔍 Find a product…"
                className={`${inputCls} max-w-xs`}
              />
              {cats.length > 1 &&
                ["", ...cats].map((c) => (
                  <button
                    key={c || "all"}
                    type="button"
                    onClick={() => setCat(c)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
            <div className="rounded-2xl border border-border-soft bg-white/4 p-8 text-center">
              <p className="text-3xl">🛠️</p>
              <p className="mt-2 font-bold">We&apos;re setting up your products.</p>
              <button
                type="button"
                onClick={() => setTab("ask")}
                className="mt-4 rounded-md accent-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black"
              >
                Tell us what you need
              </button>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-2xl border border-border-soft bg-white/4 p-6 text-center text-foreground-muted">
              No match.{" "}
              <button type="button" className="underline" onClick={() => setTab("ask")}>
                Ask us for it
              </button>
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p, i) => (
                <ProductCard key={p.id} p={p} company={company} delay={i * 60} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setTab("ask")}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-accent/50 bg-accent/5 p-4 text-left hover:bg-accent/10"
          >
            <span>
              <span className="block font-bold">Don&apos;t see what you need?</span>
              <span className="text-sm text-foreground-muted">
                Ask us. We can change a design or make something new.
              </span>
            </span>
            <span className="text-2xl">💬</span>
          </button>
        </>
      )}

      {tab === "shop" && (
        <div>
          <p className="mb-3 text-sm text-foreground-muted">
            Everything we make. Tap one to browse.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SHOP_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="pc-card flex flex-col items-center gap-2 rounded-2xl border border-border-soft bg-white/4 p-5 text-center font-bold"
              >
                <span className="text-4xl">{l.icon}</span>
                <span className="text-sm">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === "orders" && <OrdersTab company={company} onAsk={() => setTab("ask")} />}
      {tab === "ask" && <AskForm company={company} />}
      {tab === "info" && <InfoForm company={company} />}

      <p className="mt-8 text-center text-xs text-foreground-muted">
        Prices are your company&apos;s prices. Tax is added in the total. Questions?
        Call (772) 985-2854.
      </p>
    </section>
  );
}

type OrderItem = {
  title: string;
  qty: number;
  image: string;
  productId: string;
  productName: string;
  qtyBySize: Record<string, number>;
};
type Order = {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  paid: boolean;
  cancelled: boolean;
  fulfillment: "none" | "partial" | "done";
  statusUrl: string;
  items: OrderItem[];
};

function orderStatus(o: Order): { label: string; tone: string; step: number } {
  if (o.cancelled) return { label: "Cancelled", tone: "text-red-300", step: 0 };
  if (!o.paid) return { label: "Waiting for payment", tone: "text-amber-300", step: 1 };
  if (o.fulfillment === "done") return { label: "Ready / delivered", tone: "text-emerald-300", step: 4 };
  if (o.fulfillment === "partial") return { label: "Part is ready", tone: "text-cyan-300", step: 3 };
  return { label: "We're making it", tone: "text-cyan-300", step: 2 };
}

function OrdersTab({ company, onAsk }: { company: Company; onAsk: () => void }) {
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [find, setFind] = useState("");
  const [added, setAdded] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/portal/orders?companyId=${encodeURIComponent(company.id)}`);
        const d = (await r.json()) as { orders?: Order[]; error?: string };
        if (!live) return;
        if (!r.ok) setErr(d.error ?? "Couldn't load orders.");
        else {
          setOrders(d.orders ?? []);
          if (d.error) setErr(d.error);
        }
      } catch {
        if (live) setErr("Couldn't load orders.");
      }
    })();
    return () => {
      live = false;
    };
  }, [company.id]);

  function reorder(it: OrderItem): boolean {
    const p =
      company.products.find((x) => x.active && x.id === it.productId) ??
      company.products.find(
        (x) => x.active && x.name.toLowerCase() === it.productName.toLowerCase(),
      );
    if (!p) return false;
    const q = quotePortalLine(p, it.qtyBySize);
    if (!q.ok) return false;
    const item: Omit<PortalCartItem, "id" | "addedAt"> = {
      kind: "portal",
      companyId: company.id,
      productId: p.id,
      qtyBySize: it.qtyBySize,
      title: `${company.name} · ${p.name}`,
      subtitle:
        p.sizes.length > 0
          ? q.lines.map((l) => `${l.label} ×${l.qty}`).join(", ")
          : `${q.totalQty} pcs`,
      thumbnail: p.imageUrl || "📦",
      unitLabel: `${money(q.unit)} each`,
      totalPrice: q.total,
      quantity: q.totalQty,
      editHref: window.location.pathname,
    };
    addItem(item);
    return true;
  }

  function again(o: Order) {
    let n = 0;
    for (const it of o.items) if (reorder(it)) n++;
    setAdded(n > 0 ? o.id : "");
    if (n === 0) setErr("Those items aren't on your list anymore. Use Ask for something.");
  }

  if (orders === null && !err) {
    return <p className="py-10 text-center text-foreground-muted">Loading your orders…</p>;
  }

  const list = (orders ?? []).filter((o) => {
    const s = orderStatus(o).step;
    if (filter === "open" && (s === 4 || s === 0)) return false;
    if (filter === "done" && s !== 4) return false;
    const t = find.trim().toLowerCase();
    return (
      !t ||
      o.name.toLowerCase().includes(t) ||
      o.items.some((i) => i.title.toLowerCase().includes(t))
    );
  });
  const spent = (orders ?? []).filter((o) => !o.cancelled).reduce((a, o) => a + o.total, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        {[
          ["Orders", String((orders ?? []).length)],
          ["Total spent", money(spent)],
          ["In progress", String((orders ?? []).filter((o) => [1, 2, 3].includes(orderStatus(o).step)).length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border-soft bg-white/4 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">{k}</p>
            <p className="font-headline text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="🔍 Search your orders…"
          className={`${inputCls} max-w-xs`}
        />
        {(["all", "open", "done"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              filter === k ? "border-accent bg-accent text-black" : "border-border-soft bg-white/4"
            }`}
          >
            {k === "all" ? "All" : k === "open" ? "In progress" : "Delivered"}
          </button>
        ))}
      </div>

      {err && <p className="mb-3 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{err}</p>}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-white/4 p-8 text-center">
          <p className="text-3xl">📦</p>
          <p className="mt-2 font-bold">No orders to show yet.</p>
          <p className="text-sm text-foreground-muted">Orders you place here show up right away.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((o) => {
            const st = orderStatus(o);
            return (
              <article key={o.id} className="pc-card overflow-hidden rounded-2xl border border-border-soft bg-white/4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 bg-white/6 px-4 py-3 text-xs">
                  <span>
                    <span className="block font-bold uppercase tracking-wider text-foreground-muted">Placed</span>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    <span className="block font-bold uppercase tracking-wider text-foreground-muted">Total</span>
                    {money(o.total)}
                  </span>
                  <span className="ml-auto text-right">
                    <span className="block font-bold uppercase tracking-wider text-foreground-muted">Order</span>
                    {o.name}
                  </span>
                </div>
                <div className="p-4">
                  <p className={`font-headline text-lg font-bold ${st.tone}`}>{st.label}</p>
                  {st.step > 0 && (
                    <div className="mt-2 flex gap-1" aria-hidden>
                      {[1, 2, 3, 4].map((n) => (
                        <span
                          key={n}
                          className={`h-1.5 flex-1 rounded-full ${n <= st.step ? "bg-accent" : "bg-white/10"}`}
                        />
                      ))}
                    </div>
                  )}
                  <ul className="mt-4 space-y-3">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/90 text-2xl">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt="" className="h-full w-full object-contain" />
                          ) : (
                            "📦"
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-semibold">{it.title}</span>
                          <span className="text-xs text-foreground-muted">
                            {Object.keys(it.qtyBySize).length > 0
                              ? Object.entries(it.qtyBySize)
                                  .map(([k, v]) => `${k ? k + " " : ""}×${v}`)
                                  .join(", ")
                              : `Qty ${it.qty}`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {added === o.id ? (
                      <Link
                        href="/cart"
                        className="pc-pop rounded-md bg-emerald-400 px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-wider text-black"
                      >
                        ✓ Added. Go to cart
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => again(o)}
                        className="rounded-md accent-gradient px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-wider text-black"
                      >
                        🔁 Buy it again
                      </button>
                    )}
                    {o.statusUrl && (
                      <a
                        href={o.statusUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-border-strong px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-wider hover:bg-white/10"
                      >
                        Receipt
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onAsk}
                      className="rounded-md px-3 py-2.5 text-xs text-foreground-muted hover:text-foreground"
                    >
                      Problem or change?
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AskForm({ company }: { company: Company }) {
  const i = company.info;
  const [f, setF] = useState({
    title: "",
    details: "",
    qty: "",
    needBy: "",
    contact: i?.contact ?? "",
    phone: i?.phone ?? "",
    email: i?.email ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<Company["requests"]>(company.requests ?? []);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function send() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, ...f }),
      });
      const d = (await r.json()) as { request?: NonNullable<Company["requests"]>[number]; error?: string };
      if (!r.ok || !d.request) setErr(d.error ?? "Couldn't send. Try again.");
      else {
        setSent((s) => [d.request!, ...(s ?? [])]);
        setF((x) => ({ ...x, title: "", details: "", qty: "", needBy: "" }));
        setDone(true);
      }
    } catch {
      setErr("Couldn't send. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-border-soft bg-white/4 p-5">
        <h2 className="font-headline text-xl font-bold">Ask for something</h2>
        <p className="mb-4 text-sm text-foreground-muted">
          Something new, or a change to what you have. We&apos;ll call you with a price.
        </p>
        {done && (
          <p className="pc-pop mb-4 rounded-xl bg-emerald-500/15 p-3 text-sm font-semibold text-emerald-200">
            ✓ Sent! We&apos;ll be in touch soon.
          </p>
        )}
        <div className="space-y-3">
          <input className={inputCls} placeholder="What do you need? (e.g. Hoodies with our logo)" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
          <textarea className={inputCls} rows={4} placeholder="Colors, sizes, changes, anything helpful" value={f.details} onChange={(e) => set("details", e.target.value)} maxLength={2000} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="How many?" value={f.qty} onChange={(e) => set("qty", e.target.value)} maxLength={40} />
            <input className={inputCls} placeholder="Need it by?" value={f.needBy} onChange={(e) => set("needBy", e.target.value)} maxLength={40} />
          </div>
          <input className={inputCls} placeholder="Your name" value={f.contact} onChange={(e) => set("contact", e.target.value)} maxLength={80} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} inputMode="tel" placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
            <input className={inputCls} inputMode="email" placeholder="Email (optional)" value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={160} />
          </div>
          {err && <p className="text-sm text-amber-300">{err}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={send}
            className="w-full rounded-md accent-gradient px-4 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-soft bg-white/4 p-5">
        <h3 className="font-headline text-lg font-bold">Your requests</h3>
        {(sent ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(sent ?? []).slice(0, 8).map((r) => (
              <li key={r.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">{r.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      r.status === "done"
                        ? "bg-emerald-400/20 text-emerald-200"
                        : r.status === "quoted"
                          ? "bg-cyan-400/20 text-cyan-200"
                          : "bg-amber-400/20 text-amber-200"
                    }`}
                  >
                    {r.status === "new" ? "Sent" : r.status === "quoted" ? "Quoted" : "Done"}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoForm({ company }: { company: Company }) {
  const [f, setF] = useState<Info>({
    contact: company.info?.contact ?? "",
    phone: company.info?.phone ?? "",
    email: company.info?.email ?? "",
    shipTo: company.info?.shipTo ?? "",
    poNumber: company.info?.poNumber ?? "",
    notes: company.info?.notes ?? "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Info, v: string) => {
    setMsg("");
    setF((x) => ({ ...x, [k]: v }));
  };

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/portal/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, info: f }),
      });
      const d = (await r.json()) as { error?: string };
      setMsg(r.ok ? "Saved ✓" : (d.error ?? "Couldn't save."));
    } catch {
      setMsg("Couldn't save. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border-soft bg-white/4 p-5">
      <h2 className="font-headline text-xl font-bold">My info</h2>
      <p className="mb-4 text-sm text-foreground-muted">
        Saved for next time, so we never ask twice.
      </p>
      <div className="space-y-3">
        <input className={inputCls} placeholder="Contact name" value={f.contact} onChange={(e) => set("contact", e.target.value)} maxLength={80} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={inputCls} inputMode="tel" placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
          <input className={inputCls} inputMode="email" placeholder="Email" value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={160} />
        </div>
        <textarea className={inputCls} rows={2} placeholder="Ship-to address" value={f.shipTo} onChange={(e) => set("shipTo", e.target.value)} maxLength={300} />
        <input className={inputCls} placeholder="PO number (optional)" value={f.poNumber} onChange={(e) => set("poNumber", e.target.value)} maxLength={60} />
        <textarea className={inputCls} rows={3} placeholder="Notes for us (sizes, who gets what, etc.)" value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={600} />
        {msg && <p className="text-sm font-semibold text-emerald-200">{msg}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="w-full rounded-md accent-gradient px-4 py-3.5 font-headline text-sm font-bold uppercase tracking-wider text-black disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save my info"}
        </button>
      </div>
    </div>
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
