"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRICE_LIST } from "@/lib/price-list";

type ProductForm = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  price: string;
  minQty: string;
  sizesText: string;
  upchargeText: string;
  tiersText: string;
  note: string;
  active: boolean;
};

type CompanyForm = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  welcome: string;
  active: boolean;
  hasPassword: boolean;
  products: ProductForm[];
};

type ApiProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  minQty: number;
  sizes: string[];
  upcharge: Record<string, number>;
  tiers: { minQty: number; price: number }[];
  note: string;
  active: boolean;
};

type ApiCompany = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  welcome: string;
  active: boolean;
  hasPassword?: boolean;
  products: ApiProduct[];
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
    details: string;
    qty: string;
    needBy: string;
    contact: string;
    phone: string;
    email: string;
    status: "new" | "quoted" | "done";
    createdAt: string;
  }[];
};

const SIZES = "S, M, L, XL, 2XL, 3XL";

const TEMPLATES: { label: string; make: () => Partial<ProductForm> }[] = [
  {
    label: "👕 T-Shirt",
    make: () => ({
      name: "T-Shirt",
      category: "Shirts",
      sizesText: SIZES,
      upchargeText: "2XL=2, 3XL=3",
    }),
  },
  {
    label: "🧢 Hat",
    make: () => ({ name: "Embroidered Hat", category: "Hats" }),
  },
  {
    label: "👔 Polo",
    make: () => ({
      name: "Polo",
      category: "Shirts",
      sizesText: SIZES,
      upchargeText: "2XL=2, 3XL=3",
    }),
  },
  {
    label: "💳 Business Cards",
    make: () => ({ name: "Business Cards", category: "Print", minQty: "250" }),
  },
  {
    label: "📄 Flyers",
    make: () => ({ name: "Flyers", category: "Print", minQty: "100" }),
  },
  { label: "➕ Other", make: () => ({}) },
];

function newId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function blankProduct(over: Partial<ProductForm> = {}): ProductForm {
  return {
    id: newId(),
    name: "",
    category: "",
    description: "",
    imageUrl: "",
    price: "",
    minQty: "1",
    sizesText: "",
    upchargeText: "",
    tiersText: "",
    note: "",
    active: true,
    ...over,
  };
}

function toForm(c: ApiCompany): CompanyForm {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    logoUrl: c.logoUrl,
    welcome: c.welcome,
    active: c.active,
    hasPassword: !!c.hasPassword,
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl,
      price: String(p.price),
      minQty: String(p.minQty),
      sizesText: p.sizes.join(", "),
      upchargeText: Object.entries(p.upcharge)
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
      tiersText: p.tiers.map((t) => `${t.minQty}=${t.price}`).join(", "),
      note: p.note,
      active: p.active,
    })),
  };
}

function pairs(text: string): [string, number][] {
  return text
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [k, v] = x.split(/[=:]/).map((y) => y.trim());
      return [k, Number(v)] as [string, number];
    })
    .filter(([k, v]) => k && Number.isFinite(v));
}

function toPayload(c: CompanyForm) {
  return {
    id: c.id || undefined,
    name: c.name,
    logoUrl: c.logoUrl,
    welcome: c.welcome,
    active: c.active,
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl,
      price: Number(p.price) || 0,
      minQty: Number(p.minQty) || 1,
      sizes: p.sizesText.split(",").map((x) => x.trim()).filter(Boolean),
      upcharge: Object.fromEntries(pairs(p.upchargeText)),
      tiers: pairs(p.tiersText).map(([k, v]) => ({ minQty: Number(k), price: v })),
      note: p.note,
      active: p.active,
    })),
  };
}

const input =
  "w-full rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2";
const label =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted";

export default function AdminPortalPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [list, setList] = useState<ApiCompany[]>([]);
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [origin, setOrigin] = useState("");
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);
  const [pq, setPq] = useState("");
  const [show, setShow] = useState<"all" | "on" | "off">("all");

  const shown = list
    .filter((c) => {
      if (show === "on" && !c.active) return false;
      if (show === "off" && c.active) return false;
      const t = q.trim().toLowerCase();
      if (!t) return true;
      return (
        c.name.toLowerCase().includes(t) ||
        c.products.some((p) => p.name.toLowerCase().includes(t))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const load = useCallback(
    async (t: string) => {
      const r = await fetch("/api/admin/portal", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.status === 401) {
        router.push("/admin/login");
        return;
      }
      const d = (await r.json()) as { companies: ApiCompany[] };
      setList(d.companies);
    },
    [router],
  );

  useEffect(() => {
    const t = sessionStorage.getItem("adminToken") ?? "";
    if (!t) {
      router.push("/admin/login");
      return;
    }
    setToken(t);
    setOrigin(window.location.origin);
    void load(t);
  }, [load, router]);

  function startNew() {
    setForm({
      id: "",
      slug: "",
      name: "",
      logoUrl: "",
      welcome: "",
      active: true,
      hasPassword: false,
      products: [],
    });
    setPassword("");
    setMsg("");
  }

  function open(c: ApiCompany) {
    setForm(toForm(c));
    setPassword("");
    setMsg("");
  }

  function patchProduct(id: string, p: Partial<ProductForm>) {
    setForm((f) =>
      f ? { ...f, products: f.products.map((x) => (x.id === id ? { ...x, ...p } : x)) } : f,
    );
  }

  async function upload(file: File, key: string, done: (url: string) => void) {
    setUploading(key);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !d.url) throw new Error(d.error ?? "Upload failed");
      done(d.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading("");
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ company: toPayload(form), password }),
      });
      const d = (await r.json()) as { company?: ApiCompany; error?: string };
      if (!r.ok || !d.company) {
        setMsg(d.error ?? "Couldn't save.");
      } else {
        setForm(toForm(d.company));
        setPassword("");
        setMsg("Saved ✓");
        await load(token);
      }
    } catch {
      setMsg("Couldn't save. Try again.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!form?.id) return;
    if (!window.confirm(`Delete ${form.name}'s portal for good? This can't be undone.`)) return;
    setBusy(true);
    const r = await fetch(`/api/admin/portal?id=${encodeURIComponent(form.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(false);
    if (r.ok) {
      setForm(null);
      await load(token);
    } else setMsg("Couldn't delete.");
  }

  async function setStatus(rid: string, status: "new" | "quoted" | "done") {
    if (!form) return;
    await fetch("/api/admin/portal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ companyId: form.id, requestId: rid, status }),
    });
    await load(token);
  }

  const current = list.find((c) => c.id === form?.id);
  const link = form?.slug ? `${origin}/portal/${form.slug}` : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-bold">Customer Portals</h1>
          <p className="text-sm text-foreground-muted">
            One private page per company, with their products, mockups and prices.
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground"
        >
          ← Admin
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* companies */}
        <aside className="space-y-2">
          <button
            type="button"
            onClick={startNew}
            className="w-full rounded-md accent-gradient px-4 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black"
          >
            + New company
          </button>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Search customers…"
            className={input}
          />
          <div className="flex gap-1.5 text-xs">
            {(["all", "on", "off"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setShow(k)}
                className={`flex-1 rounded-md border px-2 py-1 font-semibold ${
                  show === k
                    ? "border-accent bg-accent/10"
                    : "border-border-soft text-foreground-muted"
                }`}
              >
                {k === "all" ? `All ${list.length}` : k === "on" ? "Live" : "Off"}
              </button>
            ))}
          </div>
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => open(c)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition ${
                form?.id === c.id
                  ? "border-accent bg-accent/10"
                  : "border-border-soft bg-white/4 hover:bg-white/8"
              }`}
            >
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt="" className="h-9 w-9 rounded bg-white/90 object-contain" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded bg-white/10">🏢</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{c.name}</span>
                <span className="text-[11px] text-foreground-muted">
                  {c.products.length} products{c.active ? "" : " · OFF"}
                  {(c.requests ?? []).some((r) => r.status === "new") && (
                    <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                      {(c.requests ?? []).filter((r) => r.status === "new").length} new
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-xs text-foreground-muted">No companies yet. Add your first one.</p>
          )}
          {list.length > 0 && shown.length === 0 && (
            <p className="text-xs text-foreground-muted">No match. Try another word.</p>
          )}
        </aside>

        {/* editor */}
        {!form ? (
          <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-border-soft text-sm text-foreground-muted">
            Pick a company or add a new one.
          </div>
        ) : (
          <div className="space-y-5">
            {current && ((current.requests ?? []).length > 0 || current.info?.contact || current.info?.phone || current.info?.shipTo) && (
              <section className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4">
                <h2 className="mb-2 font-headline text-lg font-bold">💬 Requests & info from them</h2>
                {(current.info?.contact || current.info?.phone || current.info?.email || current.info?.shipTo || current.info?.poNumber || current.info?.notes) && (
                  <div className="mb-3 rounded-xl bg-white/5 p-3 text-sm">
                    {current.info?.contact && <p>👤 {current.info.contact}</p>}
                    {current.info?.phone && <p>📞 <a className="underline" href={`tel:${current.info.phone}`}>{current.info.phone}</a></p>}
                    {current.info?.email && <p>✉️ <a className="underline" href={`mailto:${current.info.email}`}>{current.info.email}</a></p>}
                    {current.info?.shipTo && <p>📦 {current.info.shipTo}</p>}
                    {current.info?.poNumber && <p>PO: {current.info.poNumber}</p>}
                    {current.info?.notes && <p className="text-foreground-muted">{current.info.notes}</p>}
                  </div>
                )}
                <ul className="space-y-2">
                  {(current.requests ?? []).map((r) => (
                    <li key={r.id} className="rounded-xl bg-white/5 p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-bold">{r.title}</span>
                        <span className="flex gap-1">
                          {(["new", "quoted", "done"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => void setStatus(r.id, s)}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                                r.status === s ? "border-accent bg-accent text-black" : "border-border-soft text-foreground-muted"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </span>
                      </div>
                      {r.details && <p className="mt-1 text-foreground-muted">{r.details}</p>}
                      <p className="mt-1 text-[11px] text-foreground-muted">
                        {[r.qty && `Qty ${r.qty}`, r.needBy && `By ${r.needBy}`, r.contact, r.phone, new Date(r.createdAt).toLocaleDateString()].filter(Boolean).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="rounded-2xl border border-border-soft bg-white/4 p-4">
              <h2 className="mb-3 font-headline text-sm font-bold uppercase tracking-wider">Company</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={label}>Company name</span>
                  <input
                    className={input}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Palm Grove Hotel"
                  />
                </label>
                <label>
                  <span className={label}>
                    {form.hasPassword ? "New password (leave blank to keep)" : "Password for them"}
                  </span>
                  <input
                    className={input}
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="off"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className={label}>Welcome line (optional)</span>
                  <input
                    className={input}
                    value={form.welcome}
                    onChange={(e) => setForm({ ...form, welcome: e.target.value })}
                    placeholder="Welcome back! Your approved uniforms are below."
                  />
                </label>
                <div className="flex items-center gap-3">
                  {form.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="" className="h-14 rounded bg-white/90 object-contain p-1" />
                  )}
                  <label className="cursor-pointer rounded-lg border border-border-strong bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10">
                    {uploading === "logo" ? "Uploading…" : form.logoUrl ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void upload(f, "logo", (u) => setForm((c) => (c ? { ...c, logoUrl: u } : c)));
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 accent-[#d9f000]"
                  />
                  Portal is on
                </label>
              </div>

              {link && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs">
                  <span className="font-bold text-emerald-200">Their link:</span>
                  <code className="min-w-0 flex-1 truncate">{link}</code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(link);
                      setMsg("Link copied ✓");
                    }}
                    className="rounded-md bg-emerald-400 px-3 py-1.5 font-bold text-black"
                  >
                    Copy
                  </button>
                  <a href={link} target="_blank" rel="noreferrer" className="underline">
                    Open
                  </a>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border-soft bg-white/4 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="mr-auto font-headline text-sm font-bold uppercase tracking-wider">
                  Their products ({form.products.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setPicker((v) => !v)}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-black"
                >
                  📚 From my price list
                </button>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() =>
                      setForm((f) =>
                        f ? { ...f, products: [...f.products, blankProduct(t.make())] } : f,
                      )
                    }
                    className="rounded-full border border-border-soft bg-white/5 px-3 py-1 text-xs font-semibold hover:bg-white/10"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {picker && (
                <div className="mb-4 rounded-xl border border-accent/40 bg-accent/5 p-3">
                  <input
                    type="search"
                    value={pq}
                    onChange={(e) => setPq(e.target.value)}
                    placeholder="🔍 Search your price list…"
                    className={`${input} mb-2`}
                  />
                  <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
                    {PRICE_LIST.filter((x) =>
                      `${x.name} ${x.category}`.toLowerCase().includes(pq.trim().toLowerCase()),
                    ).map((x) => (
                      <button
                        key={x.name}
                        type="button"
                        onClick={() =>
                          setForm((f) =>
                            f
                              ? {
                                  ...f,
                                  products: [
                                    ...f.products,
                                    blankProduct({
                                      name: x.name,
                                      category: x.category,
                                      price: String(x.price),
                                      minQty: String(x.minQty),
                                      sizesText: (x.sizes ?? []).join(", "),
                                      upchargeText: Object.entries(x.upcharge ?? {})
                                        .map(([k, v]) => `${k}=${v}`)
                                        .join(", "),
                                    }),
                                  ],
                                }
                              : f,
                          )
                        }
                        className="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"
                      >
                        <span className="font-semibold">{x.name}</span>
                        <span className="shrink-0 font-mono text-cyan-300">${x.price}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-foreground-muted">
                    Tap to add. Then upload their mockup and set their own price.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {form.products.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border-soft bg-background/40 p-3">
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <div>
                        <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-white/90 text-3xl">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
                          ) : (
                            "🖼️"
                          )}
                        </div>
                        <label className="mt-1.5 block cursor-pointer rounded-lg border border-border-strong bg-white/5 px-2 py-1.5 text-center text-[11px] font-bold hover:bg-white/10">
                          {uploading === p.id ? "Uploading…" : "Upload mockup"}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void upload(f, p.id, (u) => patchProduct(p.id, { imageUrl: u }));
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="sm:col-span-2">
                          <span className={label}>Product name</span>
                          <input className={input} value={p.name} onChange={(e) => patchProduct(p.id, { name: e.target.value })} />
                        </label>
                        <label>
                          <span className={label}>Group</span>
                          <input className={input} value={p.category} onChange={(e) => patchProduct(p.id, { category: e.target.value })} placeholder="Shirts" />
                        </label>
                        <label>
                          <span className={label}>Price each ($)</span>
                          <input className={input} type="number" step="0.01" min={0} value={p.price} onChange={(e) => patchProduct(p.id, { price: e.target.value })} />
                        </label>
                        <label>
                          <span className={label}>Minimum order</span>
                          <input className={input} type="number" min={1} value={p.minQty} onChange={(e) => patchProduct(p.id, { minQty: e.target.value })} />
                        </label>
                        <label>
                          <span className={label}>Volume prices</span>
                          <input className={input} value={p.tiersText} onChange={(e) => patchProduct(p.id, { tiersText: e.target.value })} placeholder="24=12.50, 48=11" />
                        </label>
                        <label className="sm:col-span-2">
                          <span className={label}>Sizes (blank = just a quantity)</span>
                          <input className={input} value={p.sizesText} onChange={(e) => patchProduct(p.id, { sizesText: e.target.value })} placeholder={SIZES} />
                        </label>
                        <label>
                          <span className={label}>Size extra ($)</span>
                          <input className={input} value={p.upchargeText} onChange={(e) => patchProduct(p.id, { upchargeText: e.target.value })} placeholder="2XL=2, 3XL=3" />
                        </label>
                        <label className="sm:col-span-3">
                          <span className={label}>Description / note (optional)</span>
                          <input className={input} value={p.description} onChange={(e) => patchProduct(p.id, { description: e.target.value })} placeholder="Navy Core 365, left-chest logo" />
                        </label>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={p.active}
                          onChange={(e) => patchProduct(p.id, { active: e.target.checked })}
                          className="h-4 w-4 accent-[#d9f000]"
                        />
                        Show to customer
                      </label>
                      {(Number(p.price) || 0) <= 0 && (
                        <span className="text-amber-300">Set a price</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => (f ? { ...f, products: f.products.filter((x) => x.id !== p.id) } : f))
                        }
                        className="text-rose-300 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {form.products.length === 0 && (
                  <p className="text-xs text-foreground-muted">
                    Tap a product type above to add it. Then upload the mockup photo and set the price.
                  </p>
                )}
              </div>
            </section>

            <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-background/95 p-3 backdrop-blur">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-md accent-gradient px-6 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save portal"}
              </button>
              {msg && <span className="text-sm text-emerald-300">{msg}</span>}
              {form.id && (
                <button type="button" onClick={remove} className="ml-auto text-xs text-rose-300 hover:underline">
                  Delete company
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
