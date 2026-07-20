"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrPreview({
  payload,
  size = 160,
}: {
  payload: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload.trim() || " ", { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="grid place-items-center rounded-lg bg-white/5 text-xs text-foreground-muted"
      >
        …
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QR code preview"
      width={size}
      height={size}
      className="rounded-lg bg-white p-2"
    />
  );
}
