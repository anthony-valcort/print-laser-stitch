"use client";

import { useEffect, useRef, useState } from "react";

export const ACCEPT_DESIGN_FILES =
  ".png,.jpg,.jpeg,.pdf,.svg,.ai,image/png,image/jpeg,image/svg+xml,application/pdf";

export type UploadSlot = {
  file: File | null;
  fileUrl: string | null;
  isUploading: boolean;
  /** 0–100 during the file transfer to Shopify staging. */
  progress: number;
  /** True after upload finishes but while we wait for fileCreate to finalize. */
  isProcessing: boolean;
  error: string | null;
};

export const EMPTY_UPLOAD_SLOT: UploadSlot = {
  file: null,
  fileUrl: null,
  isUploading: false,
  progress: 0,
  isProcessing: false,
  error: null,
};

/**
 * XHR-based POST so we can listen to upload.progress events. Standard fetch
 * has no upload-progress hook in browsers.
 */
function xhrUpload(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: xhr.responseText,
      });
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
    xhr.open("POST", url);
    xhr.send(formData);
  });
}

/**
 * Three-step direct upload to Shopify Files. Updates the passed setter as
 * progress moves through staging → upload → register.
 */
export async function uploadDesign(
  f: File,
  set: React.Dispatch<React.SetStateAction<UploadSlot>>,
) {
  set({
    file: f,
    fileUrl: null,
    isUploading: true,
    progress: 0,
    isProcessing: false,
    error: null,
  });

  try {
    const stageResp = await fetch("/api/shopify-upload/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: f.name,
        mimeType: f.type || "application/octet-stream",
        fileSize: f.size,
      }),
    });
    const stage = (await stageResp.json()) as
      | {
          url: string;
          resourceUrl: string;
          parameters: Array<{ name: string; value: string }>;
        }
      | { error: string };
    if (!stageResp.ok || "error" in stage) {
      throw new Error(
        "error" in stage ? stage.error : "Could not get upload target",
      );
    }

    const fd = new FormData();
    for (const param of stage.parameters) fd.append(param.name, param.value);
    fd.append("file", f);

    const uploadResp = await xhrUpload(stage.url, fd, (percent) => {
      set((prev) => ({ ...prev, progress: percent }));
    });
    if (!uploadResp.ok) {
      throw new Error(
        `Upload to staging failed (${uploadResp.status}): ${uploadResp.text.slice(0, 200)}`,
      );
    }

    // File bytes are fully uploaded; now Shopify Files needs to register and
    // finalize. Switch the badge to "Processing…" while we wait.
    set((prev) => ({ ...prev, progress: 100, isProcessing: true }));

    const registerResp = await fetch("/api/shopify-upload/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceUrl: stage.resourceUrl,
        filename: f.name,
        mimeType: f.type || "application/octet-stream",
      }),
    });
    const registered = (await registerResp.json()) as
      | { fileId: string; url: string }
      | { error: string };
    if (!registerResp.ok || "error" in registered) {
      throw new Error(
        "error" in registered ? registered.error : "Failed to register file",
      );
    }

    set({
      file: f,
      fileUrl: registered.url,
      isUploading: false,
      progress: 100,
      isProcessing: false,
      error: null,
    });
  } catch (err) {
    set({
      file: f,
      fileUrl: null,
      isUploading: false,
      progress: 0,
      isProcessing: false,
      error: err instanceof Error ? err.message : "Upload failed",
    });
  }
}

export function UploadBox({
  label,
  slot,
  onSelect,
  onClear,
}: {
  label?: string;
  slot: UploadSlot;
  onSelect: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!slot.file || !slot.file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(slot.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slot.file]);

  return (
    <div>
      {label && (
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          {label}
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onSelect(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition ${
          dragActive
            ? "border-highlight bg-highlight-soft"
            : "border-border-strong bg-surface/60 hover:bg-white/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT_DESIGN_FILES}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelect(f);
          }}
        />
        {slot.file ? (
          <div className="flex w-full items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Upload preview"
                  className="h-16 w-16 rounded-lg object-contain bg-white/5 ring-1 ring-border-strong"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-lg bg-white/5 text-2xl">
                  📄
                </div>
              )}
              {slot.isUploading && (
                <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 text-[10px] font-bold text-white backdrop-blur-sm">
                  {slot.isProcessing ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    `${slot.progress}%`
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 truncate text-left">
              <div className="truncate text-xs font-medium text-foreground">
                {slot.file.name}
              </div>
              <div className="text-[11px] text-foreground-muted">
                {(slot.file.size / 1024).toFixed(1)} KB
              </div>
              {slot.isUploading && (
                <>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                    {slot.isProcessing
                      ? "Processing…"
                      : `Uploading… ${slot.progress}%`}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-[width] duration-200 ease-out ${
                        slot.isProcessing
                          ? "animate-pulse bg-blue-300"
                          : "bg-blue-400"
                      }`}
                      style={{
                        width: slot.isProcessing
                          ? "100%"
                          : `${slot.progress}%`,
                      }}
                    />
                  </div>
                </>
              )}
              {!slot.isUploading && slot.fileUrl && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  ✓ Uploaded
                </div>
              )}
              {!slot.isUploading && !slot.fileUrl && slot.error && (
                <div className="mt-1 max-w-full truncate rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                  ⚠ {slot.error}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="rounded-full border border-border-soft bg-white/5 px-2 py-0.5 text-[10px] hover:bg-white/10"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-highlight text-base">
              ⬆
            </div>
            <div className="mt-2 text-xs font-semibold">
              Drop or click to upload
            </div>
            <div className="mt-0.5 text-[10px] text-foreground-muted">
              PNG · JPG · PDF · SVG · AI · ≤20MB
            </div>
          </>
        )}
      </div>
    </div>
  );
}
