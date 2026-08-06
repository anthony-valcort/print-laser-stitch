"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMPTY_UPLOAD_SLOT,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";

export const ACCEPT_REFERENCE_IMAGES =
  ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

function ImageThumb({
  slot,
  onRemove,
}: {
  slot: UploadSlot;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!slot.file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(slot.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slot.file]);

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border-soft bg-white/5">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Reference upload"
          className="h-full w-full object-cover"
        />
      )}
      {slot.isUploading && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] font-bold text-white backdrop-blur-sm">
          {slot.isProcessing ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            `${slot.progress}%`
          )}
        </div>
      )}
      {!slot.isUploading && slot.error && (
        <div className="absolute inset-0 grid place-items-center bg-amber-950/70 p-1 text-center text-[9px] leading-tight text-amber-200">
          ⚠ Failed
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] text-white hover:bg-black/90"
        aria-label="Remove image"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Grid of reference-photo thumbnails with an always-present "add more" tile.
 * Each selected file gets its own upload slot (same Cloudinary staged-upload
 * pipeline as UploadBox) so slots can complete independently and in any order.
 */
export function MultiImageUpload({
  images,
  onImagesChange,
}: {
  images: UploadSlot[];
  onImagesChange: React.Dispatch<React.SetStateAction<UploadSlot[]>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    const startIndex = images.length;
    onImagesChange((prev) => [
      ...prev,
      ...list.map(() => EMPTY_UPLOAD_SLOT),
    ]);

    list.forEach((file, i) => {
      const index = startIndex + i;
      void uploadDesign(file, (update) => {
        onImagesChange((cur) => {
          const copy = [...cur];
          const prevSlot = copy[index] ?? EMPTY_UPLOAD_SLOT;
          copy[index] =
            typeof update === "function"
              ? (update as (p: UploadSlot) => UploadSlot)(prevSlot)
              : update;
          return copy;
        });
      });
    });
  }

  function removeAt(index: number) {
    onImagesChange((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((slot, i) => (
          <ImageThumb key={i} slot={slot} onRemove={() => removeAt(i)} />
        ))}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`grid h-20 w-20 shrink-0 cursor-pointer place-items-center rounded-xl border-2 border-dashed text-center transition ${
            dragActive
              ? "border-highlight bg-highlight-soft"
              : "border-border-strong bg-surface/60 hover:bg-white/5"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_REFERENCE_IMAGES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-1 text-foreground-muted">
            <span className="text-lg leading-none">＋</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider">
              Add
            </span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-foreground-muted">
        PNG · JPG · WEBP · ≤20MB each
      </p>
    </div>
  );
}
