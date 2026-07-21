"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GalleryItem, GalleryMediaType } from "@/lib/gallery-shopify";
import type { ShopifyCollectionSummary } from "@/lib/shopify-collections";
import {
  EMPTY_UPLOAD_SLOT,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";

const CUSTOM_VINYL_STICKER = {
  handle: "custom-vinyl-sticker",
  title: "Custom Vinyl Sticker",
};

type FormState = {
  mainCategoryHandle: string;
  mainCategoryLabel: string;
  subCategory: string;
  existingMediaUrl: string | null;
  existingMediaType: GalleryMediaType | null;
};

const EMPTY_FORM: FormState = {
  mainCategoryHandle: "",
  mainCategoryLabel: "",
  subCategory: "",
  existingMediaUrl: null,
  existingMediaType: null,
};

function itemToForm(g: GalleryItem): FormState {
  return {
    mainCategoryHandle: g.mainCategoryHandle,
    mainCategoryLabel: g.mainCategoryLabel,
    subCategory: g.subCategory ?? "",
    existingMediaUrl: g.mediaUrl,
    existingMediaType: g.mediaType,
  };
}

const optionStyle = { backgroundColor: "#1e1e1e", color: "#f5f5f5" };

export default function AdminGalleryPage() {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<ShopifyCollectionSummary[]>([]);
  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploadSlot, setUploadSlot] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);

  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("adminToken") ?? "" : "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = useCallback((msg: string, error = false) => {
    setToast(msg);
    setToastError(error);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/admin/gallery");
    const data = (await res.json()) as GalleryItem[];
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    fetchItems();
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d: ShopifyCollectionSummary[]) => setCollections(d))
      .catch(() => setCollections([]));
  }, [token, router, fetchItems]);

  function logout() {
    sessionStorage.removeItem("adminToken");
    router.push("/admin/login");
  }

  // ── Main category change → load sub-category (product) options ──────────
  async function handleMainCategoryChange(handle: string) {
    if (!handle) {
      setForm((f) => ({ ...f, mainCategoryHandle: "", mainCategoryLabel: "", subCategory: "" }));
      setSubOptions([]);
      return;
    }
    if (handle === CUSTOM_VINYL_STICKER.handle) {
      setForm((f) => ({
        ...f,
        mainCategoryHandle: handle,
        mainCategoryLabel: CUSTOM_VINYL_STICKER.title,
        subCategory: "",
      }));
      setSubOptions([]);
      return;
    }
    const collection = collections.find((c) => c.handle === handle);
    setForm((f) => ({
      ...f,
      mainCategoryHandle: handle,
      mainCategoryLabel: collection?.title ?? handle,
      subCategory: "",
    }));
    setSubOptions([]);
    setSubLoading(true);
    try {
      const res = await fetch(`/api/collections/${handle}`);
      const data = (await res.json()) as { products?: Array<{ title: string }> };
      setSubOptions((data.products ?? []).map((p) => p.title));
    } catch {
      setSubOptions([]);
    } finally {
      setSubLoading(false);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setSubOptions([]);
    setUploadSlot(EMPTY_UPLOAD_SLOT);
    setModal("add");
  }

  async function openEdit(g: GalleryItem) {
    setForm(itemToForm(g));
    setEditTarget(g);
    setUploadSlot(EMPTY_UPLOAD_SLOT);
    setModal("edit");
    if (g.mainCategoryHandle !== CUSTOM_VINYL_STICKER.handle) {
      setSubLoading(true);
      try {
        const res = await fetch(`/api/collections/${g.mainCategoryHandle}`);
        const data = (await res.json()) as { products?: Array<{ title: string }> };
        setSubOptions((data.products ?? []).map((p) => p.title));
      } catch {
        setSubOptions([]);
      } finally {
        setSubLoading(false);
      }
    } else {
      setSubOptions([]);
    }
  }

  function closeModal() {
    setModal(null);
  }

  async function handleSave() {
    if (!form.mainCategoryHandle) {
      showToast("Please pick a category", true);
      return;
    }
    let mediaUrl = form.existingMediaUrl;
    let mediaType = form.existingMediaType;
    if (uploadSlot.fileUrl && uploadSlot.file) {
      mediaUrl = uploadSlot.fileUrl;
      mediaType = uploadSlot.file.type.startsWith("video/") ? "video" : "image";
    }
    if (!mediaUrl || !mediaType) {
      showToast("Please upload an image or video", true);
      return;
    }

    setSaving(true);
    try {
      const payload: Omit<GalleryItem, "id" | "createdAt"> = {
        mediaUrl,
        mediaType,
        mainCategoryHandle: form.mainCategoryHandle,
        mainCategoryLabel: form.mainCategoryLabel,
        subCategory: form.subCategory.trim() || null,
      };

      if (modal === "add") {
        await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        showToast("Gallery item added!");
      } else if (modal === "edit" && editTarget) {
        await fetch(`/api/admin/gallery/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(payload),
        });
        showToast("Gallery item updated!");
      }

      await fetchItems();
      closeModal();
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE", headers: authHeader });
    showToast("Gallery item removed.");
    setDeleteId(null);
    await fetchItems();
  }

  const isCustomCategory = form.mainCategoryHandle === CUSTOM_VINYL_STICKER.handle;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-soft bg-surface px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <div className="font-display text-xl font-black uppercase text-[#d9f000]">
              PLS Admin
            </div>
            <div className="font-headline text-xs text-foreground-muted">
              Gallery Dashboard
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-border-soft px-3 py-1.5 font-headline text-xs text-foreground-muted transition hover:border-[#18d3e8] hover:text-[#18d3e8]"
            >
              Vehicles →
            </Link>
            <a
              href="/gallery"
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-2xl font-black uppercase">Gallery</div>
            <div className="font-headline text-sm text-foreground-muted">
              {items.length} item{items.length !== 1 ? "s" : ""} in the portfolio
            </div>
          </div>
          <button
            onClick={openAdd}
            className="rounded-xl bg-[#d9f000] px-5 py-2.5 font-headline text-sm font-black uppercase tracking-wider text-black transition hover:brightness-110"
          >
            + Add Item
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-foreground-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border-soft bg-surface p-12 text-center text-foreground-muted">
            No gallery items yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((g) => (
              <div
                key={g.id}
                className="overflow-hidden rounded-2xl border border-border-soft bg-surface"
              >
                <div className="relative aspect-square bg-background/60">
                  {g.mediaType === "video" ? (
                    <video src={g.mediaUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.mediaUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    {g.mediaType === "video" ? "🎬 Video" : "🖼 Image"}
                  </span>
                </div>
                <div className="p-3">
                  <div className="truncate font-headline text-xs font-bold uppercase text-[#d9f000]">
                    {g.mainCategoryLabel}
                  </div>
                  {g.subCategory && (
                    <div className="truncate text-xs text-foreground-muted">{g.subCategory}</div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => openEdit(g)}
                      className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-semibold hover:border-[#18d3e8] hover:text-[#18d3e8]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(g.id)}
                      className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-semibold hover:border-red-400 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-soft bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-lg font-black uppercase">
                {modal === "add" ? "Add Gallery Item" : "Edit Gallery Item"}
              </div>
              <button onClick={closeModal} className="text-foreground-muted hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Main Category
                </label>
                <select
                  value={form.mainCategoryHandle}
                  onChange={(e) => handleMainCategoryChange(e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-background px-3 py-2.5 text-sm outline-none focus:border-[#18d3e8]"
                >
                  <option value="" style={optionStyle}>Select a category…</option>
                  {collections.map((c) => (
                    <option key={c.handle} value={c.handle} style={optionStyle}>
                      {c.title}
                    </option>
                  ))}
                  <option value={CUSTOM_VINYL_STICKER.handle} style={optionStyle}>
                    {CUSTOM_VINYL_STICKER.title}
                  </option>
                </select>
              </div>

              {form.mainCategoryHandle && !isCustomCategory && (
                <div>
                  <label className="mb-1.5 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Sub Category (product) — optional
                  </label>
                  <select
                    value={form.subCategory}
                    onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                    disabled={subLoading}
                    className="w-full rounded-xl border border-border-soft bg-background px-3 py-2.5 text-sm outline-none focus:border-[#18d3e8] disabled:opacity-50"
                  >
                    <option value="" style={optionStyle}>
                      {subLoading ? "Loading…" : "None"}
                    </option>
                    {subOptions.map((title) => (
                      <option key={title} value={title} style={optionStyle}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block font-headline text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Image or Video
                </label>
                {(form.existingMediaUrl || uploadSlot.fileUrl) && !uploadSlot.isUploading && (
                  <div className="mb-2 overflow-hidden rounded-xl border border-border-soft">
                    {(uploadSlot.file?.type.startsWith("video/") ?? form.existingMediaType === "video") ? (
                      <video
                        src={uploadSlot.fileUrl ?? form.existingMediaUrl ?? undefined}
                        className="h-40 w-full object-cover"
                        muted
                        controls
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uploadSlot.fileUrl ?? form.existingMediaUrl ?? undefined}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
                    )}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadDesign(f, setUploadSlot);
                  }}
                  className="block w-full rounded-xl border border-dashed border-border-strong bg-background/60 p-3 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#18d3e8]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#18d3e8]"
                />
                {uploadSlot.isUploading && (
                  <div className="mt-1.5 text-xs text-[#18d3e8]">
                    {uploadSlot.isProcessing ? "Processing…" : `Uploading… ${uploadSlot.progress}%`}
                  </div>
                )}
                {uploadSlot.error && (
                  <div className="mt-1.5 text-xs text-red-400">{uploadSlot.error}</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-xl border border-border-soft py-2.5 font-headline text-sm font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadSlot.isUploading}
                className="flex-1 rounded-xl bg-[#d9f000] py-2.5 font-headline text-sm font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border-soft bg-surface p-6 text-center">
            <div className="font-display text-lg font-black uppercase">Delete this item?</div>
            <p className="mt-2 text-sm text-foreground-muted">This can&apos;t be undone.</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-border-soft py-2.5 text-sm font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-black uppercase text-white hover:brightness-110"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-3 text-sm shadow-2xl ${
            toastError
              ? "border-red-400/40 bg-red-500/20 text-red-200"
              : "border-border-strong bg-surface-elevated"
          }`}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
