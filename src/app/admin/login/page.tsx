"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Incorrect password. Try again.");
        setLoading(false);
        return;
      }

      const { token } = (await res.json()) as { token: string };
      sessionStorage.setItem("adminToken", token);
      router.push("/admin/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🔐</div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">
            Admin Login
          </h1>
          <p className="mt-1 font-headline text-sm text-foreground-muted">
            Print Laser Stitch — Dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border-soft bg-surface p-6 space-y-4"
        >
          <div>
            <label className="mb-1.5 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-border-soft bg-background px-3 py-2.5 font-headline text-sm outline-none focus:border-[#d9f000] focus:ring-1 focus:ring-[#d9f000]"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[#d94cb3]/10 px-3 py-2 font-headline text-xs text-[#d94cb3]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#d9f000] py-3 font-headline text-sm font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center font-headline text-xs text-foreground-muted/40">
          <a href="/" className="hover:text-foreground-muted">
            ← Back to site
          </a>
        </p>
      </div>
    </div>
  );
}
