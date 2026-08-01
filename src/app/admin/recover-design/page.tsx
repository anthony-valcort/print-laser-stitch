"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RowStatus = "idle" | "loading" | "done" | "error";

type Row = {
  url: string;
  status: RowStatus;
  message?: string;
};

export default function RecoverDesignPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("adminToken") ?? "" : "";

  useEffect(() => {
    if (!token) router.replace("/admin/login");
  }, [token, router]);

  async function downloadOne(url: string, index: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: "loading", message: undefined } : r)),
    );
    try {
      const res = await fetch("/api/admin/recover-design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "design-file";

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, status: "done" } : r)),
      );
    } catch (e) {
      setRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? { ...r, status: "error", message: e instanceof Error ? e.message : "Failed" }
            : r,
        ),
      );
    }
  }

  async function handleDownloadAll() {
    const urls = input
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    const next: Row[] = urls.map((url) => ({ url, status: "idle" }));
    setRows(next);
    for (let i = 0; i < urls.length; i++) {
      await downloadOne(urls[i], i);
    }
  }

  function logout() {
    sessionStorage.removeItem("adminToken");
    router.push("/admin/login");
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-soft bg-surface px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <div className="font-display text-xl font-black uppercase text-[#d9f000]">
              PLS Admin
            </div>
            <div className="font-headline text-xs text-foreground-muted">
              Recover Original Design Files
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/gallery"
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]"
            >
              Gallery
            </Link>
            <button
              onClick={logout}
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#d94cb3] hover:text-[#d94cb3]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border-soft bg-surface p-5">
          <h1 className="font-display text-lg font-black uppercase">
            Recover a design file&apos;s original quality
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Order pages served from Shopify (cdn.shopify.com) send a compressed
            WebP/AVIF copy when you right-click → Save image. Paste one or
            more of those links below (one per line — Design File, Approved
            Proof, Cutline, etc. from an order) and this fetches the true,
            uncompressed original instead.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder={
              "https://cdn.shopify.com/s/files/1/.../Design.png\nhttps://cdn.shopify.com/s/files/1/.../Proof.png"
            }
            className="mt-4 w-full resize-none rounded-xl border border-border-soft bg-white/5 px-4 py-3 font-mono text-xs text-foreground placeholder:text-foreground-muted/50 outline-none ring-[#18d3e8]/40 focus:ring-2"
          />

          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={!input.trim()}
            className="mt-3 w-full rounded-2xl accent-gradient px-5 py-3 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download original{rows.length > 1 ? "s" : ""}
          </button>

          {rows.length > 0 && (
            <div className="mt-5 space-y-2">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-soft bg-white/3 px-3 py-2 text-xs"
                >
                  <span className="truncate text-foreground-muted">{r.url}</span>
                  {r.status === "loading" && (
                    <span className="shrink-0 text-[#18d3e8]">Fetching…</span>
                  )}
                  {r.status === "done" && (
                    <span className="shrink-0 text-emerald-300">✓ Downloaded</span>
                  )}
                  {r.status === "error" && (
                    <span className="shrink-0 text-amber-300">⚠ {r.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
