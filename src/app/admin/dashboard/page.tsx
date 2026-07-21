"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ALL_PARTS,
  PART_LABELS,
  type VehicleSticker,
  type PartKey,
  type StickerPart,
} from "@/lib/vehicle-sticker-data";

// ─── Form types ────────────────────────────────────────────────────────────────
type PartEntry = {
  enabled: boolean;
  price: string;
  /** Already-saved image URLs */
  imageUrls: string[];
  /** Files pending upload (held in memory until Save) */
  pendingFiles: File[];
  pendingPreviews: string[];
  /** Controlled URL input field */
  urlInput: string;
  /** Free-text pattern/finish name, e.g. "Camo", "Topographic". */
  skinName: string;
};

type FormState = {
  make: string;
  model: string;
  yearStart: string;
  yearEnd: string;
  /** Vehicle main image URL */
  imageUrl: string;
  imageFile?: File;
  imagePreview?: string;
  parts: Partial<Record<PartKey, PartEntry>>;
};

function emptyPart(): PartEntry {
  return { enabled: false, price: "", imageUrls: [], pendingFiles: [], pendingPreviews: [], urlInput: "", skinName: "" };
}

const EMPTY_FORM: FormState = {
  make: "", model: "", yearStart: "", yearEnd: "", imageUrl: "",
  parts: {
    hoodSet: emptyPart(), bedside: emptyPart(), fullSet: emptyPart(), top: emptyPart(),
  },
};

function partToEntry(sp: StickerPart | undefined): PartEntry {
  if (!sp) return emptyPart();
  const urls = sp.imageUrls?.length ? sp.imageUrls : sp.imageUrl ? [sp.imageUrl] : [];
  return { enabled: true, price: String(sp.price), imageUrls: urls, pendingFiles: [], pendingPreviews: [], urlInput: "", skinName: sp.skinName ?? "" };
}

function vehicleToForm(v: VehicleSticker): FormState {
  const years = [...v.years].sort((a, b) => a - b);
  return {
    make: v.make, model: v.model,
    yearStart: String(years[0] ?? ""), yearEnd: String(years[years.length - 1] ?? ""),
    imageUrl: v.imageUrl ?? "",
    parts: {
      hoodSet: partToEntry(v.parts.hoodSet),
      bedside: partToEntry(v.parts.bedside),
      fullSet: partToEntry(v.parts.fullSet),
      top: partToEntry(v.parts.top),
    },
  };
}

function formToPayload(f: FormState): Omit<VehicleSticker, "id"> {
  const start = parseInt(f.yearStart);
  const end = parseInt(f.yearEnd);
  const years =
    !isNaN(start) && !isNaN(end) && end >= start
      ? Array.from({ length: end - start + 1 }, (_, i) => start + i)
      : [];

  const parts: Partial<Record<PartKey, StickerPart>> = {};
  for (const key of ALL_PARTS) {
    const p = f.parts[key];
    if (p?.enabled && p.price) {
      parts[key] = {
        price: parseFloat(p.price),
        imageUrls: p.imageUrls,
        imageUrl: p.imageUrls[0],
        skinName: p.skinName.trim() || undefined,
      };
    }
  }
  return { make: f.make.trim(), model: f.model.trim(), years, imageUrl: f.imageUrl.trim() || undefined, parts };
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<VehicleSticker | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const [setupRunning, setSetupRunning] = useState(false);

  // Password change state
  const [pwSection, setPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("adminToken") ?? "" : "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = useCallback((msg: string, error = false) => {
    setToast(msg);
    setToastError(error);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchVehicles = useCallback(async () => {
    const res = await fetch("/api/admin/vehicles");
    const data = (await res.json()) as VehicleSticker[];
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    fetchVehicles();
  }, [token, router, fetchVehicles]);

  function logout() {
    sessionStorage.removeItem("adminToken");
    router.push("/admin/login");
  }

  // ── Image upload helper ───────────────────────────────────────────────────
  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", headers: authHeader, body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!data.url) throw new Error(data.error ?? "Upload failed");
    return data.url;
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openAdd() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal("add");
  }

  function openEdit(v: VehicleSticker) {
    setForm(vehicleToForm(v));
    setEditTarget(v);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    for (const p of Object.values(form.parts)) {
      p?.pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    }
  }

  function setVehicleImageFile(file: File) {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm((f) => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file) }));
  }

  // ── Per-part multi-image helpers ──────────────────────────────────────────
  function setPart(key: PartKey, patch: Partial<PartEntry>) {
    setForm((prev) => ({
      ...prev,
      parts: { ...prev.parts, [key]: { ...(prev.parts[key] ?? emptyPart()), ...patch } },
    }));
  }

  function addPartUrl(key: PartKey) {
    const p = form.parts[key] ?? emptyPart();
    const url = p.urlInput.trim();
    if (!url) return;
    setPart(key, { imageUrls: [...p.imageUrls, url], urlInput: "" });
  }

  function removePartUrl(key: PartKey, idx: number) {
    const p = form.parts[key] ?? emptyPart();
    setPart(key, { imageUrls: p.imageUrls.filter((_, i) => i !== idx) });
  }

  function removePending(key: PartKey, idx: number) {
    const p = form.parts[key] ?? emptyPart();
    URL.revokeObjectURL(p.pendingPreviews[idx]);
    setPart(key, {
      pendingFiles: p.pendingFiles.filter((_, i) => i !== idx),
      pendingPreviews: p.pendingPreviews.filter((_, i) => i !== idx),
    });
  }

  // ── Save (upload pending images then POST/PUT) ────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      // Vehicle main image
      let vehicleImageUrl = form.imageUrl;
      if (form.imageFile) vehicleImageUrl = await uploadFile(form.imageFile);

      // Per-part: upload pending files → merge with stored URLs
      const updatedParts = { ...form.parts };
      for (const key of ALL_PARTS) {
        const p = form.parts[key];
        if (p?.enabled && p.pendingFiles.length > 0) {
          const newUrls = await Promise.all(p.pendingFiles.map(uploadFile));
          updatedParts[key] = {
            ...p,
            imageUrls: [...p.imageUrls, ...newUrls],
            pendingFiles: [],
            pendingPreviews: [],
          };
        }
      }

      const payload = formToPayload({ ...form, imageUrl: vehicleImageUrl, parts: updatedParts });

      if (modal === "add") {
        await fetch("/api/admin/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        showToast("Vehicle added!");
      } else if (modal === "edit" && editTarget) {
        await fetch(`/api/admin/vehicles/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        showToast("Vehicle updated!");
      }

      await fetchVehicles();
      closeModal();
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE", headers: authHeader });
    showToast("Vehicle removed.");
    setDeleteId(null);
    await fetchVehicles();
  }

  // ── Shopify Setup ─────────────────────────────────────────────────────────
  async function runSetup() {
    setSetupRunning(true);
    try {
      const res = await fetch("/api/admin/setup");
      const data = (await res.json()) as { results: Record<string, string> };
      const summary = Object.entries(data.results)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      showToast(`Setup done — ${summary}`);
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setSetupRunning(false);
    }
  }

  // ── Password change ───────────────────────────────────────────────────────
  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      showToast("New passwords do not match", true);
      return;
    }
    if (newPw.length < 6) {
      showToast("Password must be at least 6 characters", true);
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Failed", true);
        return;
      }
      // Update session token with new hash
      if (data.token) sessionStorage.setItem("adminToken", data.token);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSection(false);
      showToast("Password changed! You are still logged in.");
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setPwSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b border-border-soft bg-surface px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <div className="font-display text-xl font-black uppercase text-[#d9f000]">
              PLS Admin
            </div>
            <div className="font-headline text-xs text-foreground-muted">
              Vehicle Sticker Dashboard
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/gallery"
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]"
            >
              Gallery →
            </Link>
            {/* <button
              onClick={runSetup}
              disabled={setupRunning}
              title="Run once to create Shopify Metaobject definitions"
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8] disabled:opacity-50"
            >
              {setupRunning ? "Setting up…" : "Shopify Setup"}
            </button> */}
            <a
              href="/vehicle-stickers"
              target="_blank"
              className="font-headline text-xs text-foreground-muted transition hover:text-[#18d3e8]"
            >
              View page ↗
            </a>
            <button
              onClick={logout}
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#d94cb3] hover:text-[#d94cb3]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Stats + Add */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-2xl font-black uppercase">Vehicles</div>
            <div className="font-headline text-sm text-foreground-muted">
              {vehicles.length} model{vehicles.length !== 1 ? "s" : ""} in the catalog
            </div>
          </div>
          <button
            onClick={openAdd}
            className="rounded-xl bg-[#d9f000] px-5 py-2.5 font-headline text-sm font-black uppercase tracking-wider text-black transition hover:brightness-110"
          >
            + Add Vehicle
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-foreground-muted">Loading…</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border-soft bg-background/40">
                    {["Image", "Make", "Model", "Years", "Sets Available", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted last:text-right"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="transition hover:bg-white/2">
                      <td className="px-4 py-3">
                        {v.imageUrl ? (
                          <img
                            src={v.imageUrl}
                            alt={`${v.make} ${v.model}`}
                            className="h-10 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-white/5 text-lg">
                            🚗
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-headline font-semibold">{v.make}</td>
                      <td className="px-4 py-3 text-foreground-muted">{v.model}</td>
                      <td className="px-4 py-3 text-foreground-muted">
                        {v.years[0]}–{v.years[v.years.length - 1]}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ALL_PARTS.filter((p) => v.parts[p]).map((p) => (
                            <span
                              key={p}
                              className="rounded-full border border-[#d9f000]/30 bg-[#d9f000]/10 px-2 py-0.5 font-headline text-[10px] text-[#d9f000]"
                            >
                              {PART_LABELS[p]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(v)}
                          className="mr-2 font-headline text-xs text-[#18d3e8] transition hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(v.id)}
                          className="font-headline text-xs text-[#d94cb3] transition hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Password Change Section ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border-soft bg-surface overflow-hidden">
          <button
            onClick={() => setPwSection((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-white/2"
          >
            <div>
              <div className="font-display text-sm font-black uppercase">Change Admin Password</div>
              <div className="font-headline text-xs text-foreground-muted">
                Password is stored as SHA-256 hash in Shopify
              </div>
            </div>
            <span className="font-headline text-foreground-muted">{pwSection ? "▲" : "▼"}</span>
          </button>

          {pwSection && (
            <div className="border-t border-border-soft px-6 py-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="Current password"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="New password (min 6)"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                  className="rounded-xl bg-[#d9f000] px-5 py-2 font-headline text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {pwSaving ? "Saving…" : "Update Password"}
                </button>
              </div>
              <p className="font-headline text-[11px] text-foreground-muted/70">
                After changing, your current browser session stays valid — but other
                devices will need to log in again.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
              <h2 className="font-display text-lg font-black uppercase">
                {modal === "add" ? "Add Vehicle" : "Edit Vehicle"}
              </h2>
              <button onClick={closeModal} className="text-foreground-muted hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
              {/* Make + Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Make
                  </label>
                  <input
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="e.g. Toyota"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Model
                  </label>
                  <input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="e.g. Tacoma"
                  />
                </div>
              </div>

              {/* Years */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Year From
                  </label>
                  <input
                    type="number"
                    value={form.yearStart}
                    onChange={(e) => setForm({ ...form, yearStart: e.target.value })}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="2016"
                    min="1980"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Year To
                  </label>
                  <input
                    type="number"
                    value={form.yearEnd}
                    onChange={(e) => setForm({ ...form, yearEnd: e.target.value })}
                    className="w-full rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-sm outline-none focus:border-[#d9f000]"
                    placeholder="2024"
                    min="1980"
                    max="2030"
                  />
                </div>
              </div>

              {/* Vehicle main image */}
              <div>
                <label className="mb-1 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Vehicle Image
                </label>
                <div className="space-y-2">
                  {(form.imagePreview || form.imageUrl) && (
                    <img
                      src={form.imagePreview ?? form.imageUrl}
                      alt="Vehicle"
                      className="h-16 w-24 rounded-lg object-cover border border-border-soft"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="url"
                      value={form.imagePreview ? "" : form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value, imageFile: undefined, imagePreview: undefined })}
                      placeholder="Paste Shopify image URL…"
                      className="min-w-0 flex-1 rounded-lg border border-border-soft bg-background px-3 py-2 font-headline text-xs outline-none focus:border-[#d9f000]"
                    />
                    <label className="cursor-pointer rounded-lg border border-dashed border-border-soft bg-background px-3 py-2 font-headline text-xs text-foreground-muted transition hover:border-[#d9f000] hover:text-[#d9f000]">
                      Upload file
                      <input type="file" accept="image/*" className="sr-only"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setVehicleImageFile(f); }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Parts */}
              <div>
                <label className="mb-2 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Available Sets, Prices &amp; Images
                </label>
                <div className="space-y-3 rounded-xl border border-border-soft bg-background/60 p-4">
                  {ALL_PARTS.map((key) => {
                    const p = form.parts[key] ?? emptyPart();
                    return (
                      <div key={key} className="space-y-2">
                        {/* Row: checkbox + label + price */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`part-${key}`}
                            checked={p.enabled}
                            onChange={(e) => setPart(key, { enabled: e.target.checked })}
                            className="h-4 w-4 accent-[#d9f000]"
                          />
                          <label htmlFor={`part-${key}`} className="w-24 font-headline text-sm font-semibold">
                            {PART_LABELS[key]}
                          </label>
                          <div className="flex flex-1 items-center gap-1.5">
                            <span className="font-headline text-sm text-foreground-muted">$</span>
                            <input
                              type="number" step="0.01" min="0"
                              value={p.price}
                              onChange={(e) => setPart(key, { price: e.target.value })}
                              disabled={!p.enabled}
                              className="w-28 rounded-lg border border-border-soft bg-background px-2 py-1.5 font-headline text-sm outline-none focus:border-[#d9f000] disabled:opacity-40"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Image for this part (only when enabled) */}
                        {p.enabled && (
                          <div className="ml-7 space-y-2">
                            {/* Skin / pattern name */}
                            <input
                              type="text"
                              value={p.skinName}
                              onChange={(e) => setPart(key, { skinName: e.target.value })}
                              placeholder="Skin name (e.g. Camo, Topographic, Carbon Fiber)…"
                              className="w-full rounded-lg border border-border-soft bg-background px-2 py-1.5 font-headline text-[11px] outline-none focus:border-[#18d3e8]"
                            />
                            {/* Existing images grid */}
                            {(p.imageUrls.length > 0 || p.pendingPreviews.length > 0) && (
                              <div className="flex flex-wrap gap-2">
                                {p.imageUrls.map((url, i) => (
                                  <div key={i} className="relative">
                                    <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover border border-border-soft" />
                                    <button
                                      onClick={() => removePartUrl(key, i)}
                                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#d94cb3] text-[10px] font-black text-white shadow"
                                    >✕</button>
                                  </div>
                                ))}
                                {p.pendingPreviews.map((url, i) => (
                                  <div key={`pend-${i}`} className="relative">
                                    <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover border border-dashed border-[#18d3e8]/60" />
                                    <button
                                      onClick={() => removePending(key, i)}
                                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#d94cb3] text-[10px] font-black text-white shadow"
                                    >✕</button>
                                    <span className="absolute bottom-0.5 left-0 right-0 text-center font-headline text-[9px] text-[#18d3e8]">pending</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Add URL */}
                            <div className="flex gap-1.5">
                              <input
                                type="url"
                                value={p.urlInput}
                                onChange={(e) => setPart(key, { urlInput: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && addPartUrl(key)}
                                placeholder="Paste image URL…"
                                className="min-w-0 flex-1 rounded-lg border border-border-soft bg-background px-2 py-1.5 font-headline text-[11px] outline-none focus:border-[#18d3e8]"
                              />
                              <button
                                onClick={() => addPartUrl(key)}
                                disabled={!p.urlInput.trim()}
                                className="rounded-lg bg-[#18d3e8]/15 px-2 py-1.5 font-headline text-[11px] font-bold text-[#18d3e8] transition hover:bg-[#18d3e8]/25 disabled:opacity-40"
                              >Add</button>
                              <label className="cursor-pointer rounded-lg border border-dashed border-border-soft bg-background px-2 py-1.5 font-headline text-[11px] text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]">
                                Upload
                                <input type="file" accept="image/*" multiple className="sr-only"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []);
                                    if (!files.length) return;
                                    const cur = form.parts[key] ?? emptyPart();
                                    const newPreviews = files.map((f) => URL.createObjectURL(f));
                                    setPart(key, {
                                      pendingFiles: [...cur.pendingFiles, ...files],
                                      pendingPreviews: [...cur.pendingPreviews, ...newPreviews],
                                    });
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-border-soft px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-xl border border-border-soft px-5 py-2.5 font-headline text-sm text-foreground-muted transition hover:border-[#d94cb3]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.make || !form.model}
                className="rounded-xl bg-[#d9f000] px-5 py-2.5 font-headline text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? "Uploading & Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/70" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-xs rounded-2xl border border-border-soft bg-surface p-6 text-center shadow-2xl space-y-4">
            <div className="text-3xl">🗑️</div>
            <p className="font-headline text-sm">Are you sure you want to remove this vehicle?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-border-soft py-2.5 font-headline text-sm text-foreground-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-[#d94cb3] py-2.5 font-headline text-sm font-bold text-black"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-5 py-3 font-headline text-sm font-semibold shadow-2xl ${
            toastError
              ? "border-[#d94cb3]/30 bg-surface text-[#d94cb3]"
              : "border-[#d9f000]/30 bg-surface text-[#d9f000]"
          }`}
        >
          {toastError ? "✗ " : "✓ "}{toast}
        </div>
      )}
    </div>
  );
}
