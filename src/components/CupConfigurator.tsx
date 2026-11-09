"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MobileBuyBar from "@/components/MobileBuyBar";
import type { ShopifyProduct } from "@/lib/shopify-products";
import { useCart } from "@/lib/cart-store";
import type { ProductCartItem } from "@/lib/cart-types";
import { successFeedback } from "@/lib/interactions";
import { openCartDrawer } from "@/lib/cart-drawer";
import {
  ACCEPT_PREVIEWABLE_DESIGN_FILES,
  EMPTY_UPLOAD_SLOT,
  UploadBox,
  uploadDesign,
  type UploadSlot,
} from "@/components/configurator/UploadBox";
import { uploadFlattenedDesign } from "@/lib/template-fit/upload-flattened";

/**
 * Optional product photo for the mockup. When set (a URL under /public or a
 * hosted image), it is drawn as the cup body instead of the built-in
 * illustration. Leave null to use the illustration.
 */
const CUP_PHOTO_URL: string | null = "/cup-20oz.jpg";
const HAS_PHOTO = !!CUP_PHOTO_URL;
const CV_W = HAS_PHOTO ? 480 : 320;
const CV_H = HAS_PHOTO ? 480 : 560;

const FINISH_OPT = "Finish";
const QTY_OPT = "Qty - Price";
const WRAP_W_IN = 8;
const WRAP_H_IN = 3.4;
const CIRC_IN = 9.4; // 20oz tumbler circumference
const ART_PX_PER_IN = 100;

const FINISHES = [
  {
    name: "Laser Engraved",
    title: "Laser Engraved",
    blurb: "One tone, bare steel. Permanent.",
  },
  {
    name: "UV Full Color",
    title: "UV Full Color",
    blurb: "Every color. Extra durable. +30%",
  },
] as const;

type Props = { product: ShopifyProduct };

export default function CupConfigurator({ product }: Props) {
  const router = useRouter();
  const { addItem } = useCart();

  const [finish, setFinish] = useState<string>("Laser Engraved");
  const [qtyValue, setQtyValue] = useState<string>("1 Cup");
  const [upload, setUpload] = useState<UploadSlot>(EMPTY_UPLOAD_SLOT);
  const [scale, setScale] = useState(85);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const variantFor = useCallback(
    (f: string, q: string) =>
      product.variants.find(
        (v) =>
          v.selectedOptions.some((o) => o.name === FINISH_OPT && o.value === f) &&
          v.selectedOptions.some((o) => o.name === QTY_OPT && o.value === q),
      ),
    [product.variants],
  );

  const tiers = useMemo(() => {
    const vals =
      product.options.find((o) => o.name === QTY_OPT)?.values ?? [];
    const rows = vals
      .map((value) => {
        const qty = parseInt(value, 10) || 1;
        const price = Number(variantFor(finish, value)?.price ?? 0);
        return { value, qty, price, each: price / qty };
      })
      .sort((a, b) => a.qty - b.qty);
    const base = rows[0]?.each ?? 0;
    return rows.map((r) => ({
      ...r,
      save: base > 0 ? Math.round((1 - r.each / base) * 100) : 0,
    }));
  }, [product.options, variantFor, finish]);

  const variant = variantFor(finish, qtyValue);
  const total = Number(variant?.price ?? 0);
  const qtyNum = parseInt(qtyValue, 10) || 1;
  const hasFile = !!upload.fileUrl;
  const canBuy = hasFile && !!variant && !upload.isUploading && !busy;

  // Art source for the mockup: the local file when we have it, else its URL.
  const [artImg, setArtImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!upload.file || !upload.file.type.startsWith("image/")) {
      setArtImg(null);
      return;
    }
    const restored = upload.file.size === 0 && !!upload.fileUrl;
    const src = restored
      ? (upload.fileUrl as string)
      : URL.createObjectURL(upload.file);
    const img = new Image();
    if (restored) img.crossOrigin = "anonymous";
    img.onload = () => setArtImg(img);
    img.onerror = () => setArtImg(null);
    img.src = src;
    return () => {
      if (!restored) URL.revokeObjectURL(src);
    };
  }, [upload.file, upload.fileUrl]);

  // Cup photo (optional)
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!CUP_PHOTO_URL) return;
    const img = new Image();
    img.onload = () => setPhoto(img);
    img.src = CUP_PHOTO_URL;
  }, []);

  // Unrolled artwork (the 8" x 3.4" wrap area) — rebuilt when inputs change.
  const wrapArt = useMemo(() => {
    if (typeof document === "undefined") return null;
    const W = WRAP_W_IN * ART_PX_PER_IN;
    const H = Math.round(WRAP_H_IN * ART_PX_PER_IN);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    if (!g) return null;
    if (!artImg) {
      g.setLineDash([10, 8]);
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.lineWidth = 3;
      g.strokeRect(W / 2 - 160, 40, 320, H - 80);
      g.setLineDash([]);
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.font = "600 34px sans-serif";
      g.textAlign = "center";
      g.fillText("YOUR DESIGN HERE", W / 2, H / 2 + 12);
      return c;
    }
    const k = scale / 100;
    const r = Math.min((W * k) / artImg.width, (H * k) / artImg.height);
    const dw = artImg.width * r;
    const dh = artImg.height * r;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    if (finish === "UV Full Color") {
      g.drawImage(artImg, dx, dy, dw, dh);
      return c;
    }
    // Laser engraved: one tone of bare steel, shaped by the artwork.
    const t = document.createElement("canvas");
    t.width = Math.max(1, Math.round(dw));
    t.height = Math.max(1, Math.round(dh));
    const tg = t.getContext("2d");
    if (!tg) return c;
    tg.drawImage(artImg, 0, 0, t.width, t.height);
    let data: ImageData;
    try {
      data = tg.getImageData(0, 0, t.width, t.height);
    } catch {
      g.drawImage(artImg, dx, dy, dw, dh);
      return c;
    }
    const px = data.data;
    let transparent = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) transparent++;
    const useAlpha = transparent / (px.length / 4) > 0.02;
    for (let i = 0; i < px.length; i += 4) {
      const luma = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
      const a = useAlpha ? px[i + 3] / 255 : (1 - luma) * (px[i + 3] / 255);
      px[i] = 214;
      px[i + 1] = 218;
      px[i + 2] = 224;
      px[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
    tg.putImageData(data, 0, 0);
    g.drawImage(t, dx, dy, dw, dh);
    return c;
  }, [artImg, finish, scale]);

  // Rotation (radians). 0 = front.
  const rotRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const spinRef = useRef(false);
  spinRef.current = spinning;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const CW = CV_W;
    const CH = CV_H;
    if (cv.width !== CW * dpr) {
      cv.width = CW * dpr;
      cv.height = CH * dpr;
    }
    const g = cv.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, CW, CH);

    const cx = CW / 2;
    const topY = 112;
    const botY = 510;
    const rTop = 70;
    const rBot = 57;

    // Shadow
    const sh = g.createRadialGradient(cx, botY + 14, 4, cx, botY + 14, 80);
    sh.addColorStop(0, "rgba(0,0,0,0.35)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh;
    g.fillRect(0, botY - 20, CW, 60);

    if (HAS_PHOTO) {
      g.clearRect(0, 0, CW, CH);
      if (!photo) return;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, CW, CH);
      g.drawImage(photo, 0, 0, CW, CH);
      if (wrapArt) {
        // Coordinates below are in the 1920px photo space.
        const k = CW / 1920;
        const pcx = 965;
        const r = 405;
        const y0 = 560;
        const h = 963;
        const span = (WRAP_W_IN / CIRC_IN) * Math.PI * 2;
        const N = 200;
        g.save();
        g.beginPath();
        g.moveTo((pcx - 428) * k, 395 * k);
        g.lineTo((pcx + 428) * k, 395 * k);
        g.lineTo((pcx + 372) * k, 1640 * k);
        g.lineTo((pcx - 372) * k, 1640 * k);
        g.closePath();
        g.clip();
        for (let i = 0; i < N; i++) {
          const th0 = -Math.PI / 2 + (i / N) * Math.PI;
          const th1 = -Math.PI / 2 + ((i + 1) / N) * Math.PI;
          const mid = (th0 + th1) / 2;
          const u = (mid + rotRef.current) / span + 0.5;
          if (u < 0 || u > 1) continue;
          const sx = u * wrapArt.width;
          const sw = Math.max(1, (wrapArt.width * (th1 - th0)) / span);
          const x0 = (pcx + r * Math.sin(th0)) * k;
          const x1 = (pcx + r * Math.sin(th1)) * k;
          g.drawImage(wrapArt, sx, 0, sw, wrapArt.height, x0, y0 * k, x1 - x0 + 0.6, h * k);
        }
        // Soft edge shading so the art sits on the curve.
        const lg = g.createLinearGradient((pcx - 428) * k, 0, (pcx + 428) * k, 0);
        lg.addColorStop(0, "rgba(0,0,0,0.55)");
        lg.addColorStop(0.2, "rgba(0,0,0,0)");
        lg.addColorStop(0.8, "rgba(0,0,0,0)");
        lg.addColorStop(1, "rgba(0,0,0,0.55)");
        g.fillStyle = lg;
        g.fillRect((pcx - 428) * k, 395 * k, 856 * k, 1245 * k);
        g.restore();
      }
      return;
    }

    const bodyPath = () => {
      g.beginPath();
      g.moveTo(cx - rTop, topY);
      g.lineTo(cx + rTop, topY);
      g.lineTo(cx + rBot, botY - 14);
      g.quadraticCurveTo(cx + rBot, botY, cx + rBot - 14, botY);
      g.lineTo(cx - rBot + 14, botY);
      g.quadraticCurveTo(cx - rBot, botY, cx - rBot, botY - 14);
      g.closePath();
    };

    if (!photo) {
      // Body (black powder coat)
      bodyPath();
      g.fillStyle = "#17191d";
      g.fill();
      // Lid
      g.fillStyle = "#2a2d33";
      g.beginPath();
      g.roundRect(cx - rTop - 6, topY - 30, (rTop + 6) * 2, 30, 8);
      g.fill();
      g.fillStyle = "#1f2227";
      g.beginPath();
      g.roundRect(cx - rTop + 12, topY - 52, (rTop - 12) * 2, 24, 8);
      g.fill();
      g.fillStyle = "#0b0c0e";
      g.beginPath();
      g.roundRect(cx + 8, topY - 44, 34, 8, 4);
      g.fill();
    }

    // Wrapped artwork
    if (wrapArt && !photo) {
      const y0 = 205;
      const pxPerIn = (rTop - 5) / (CIRC_IN / (2 * Math.PI));
      const h = WRAP_H_IN * pxPerIn;
      const r = rTop - 6;
      const span = (WRAP_W_IN / CIRC_IN) * Math.PI * 2; // wrap angle
      const N = 180;
      g.save();
      bodyPath();
      g.clip();
      for (let i = 0; i < N; i++) {
        const th0 = -Math.PI / 2 + (i / N) * Math.PI;
        const th1 = -Math.PI / 2 + ((i + 1) / N) * Math.PI;
        const mid = (th0 + th1) / 2;
        const u = (mid + rotRef.current) / span + 0.5;
        if (u < 0 || u > 1) continue;
        const sx = u * wrapArt.width;
        const sw = Math.max(1, (wrapArt.width * (th1 - th0)) / span);
        const x0 = cx + r * Math.sin(th0);
        const x1 = cx + r * Math.sin(th1);
        g.drawImage(wrapArt, sx, 0, sw, wrapArt.height, x0, y0, x1 - x0 + 0.6, h);
      }
      g.restore();
    }

    // Shading
    if (!photo) {
      g.save();
      bodyPath();
      g.clip();
      const lg = g.createLinearGradient(cx - rTop, 0, cx + rTop, 0);
      lg.addColorStop(0, "rgba(0,0,0,0.65)");
      lg.addColorStop(0.18, "rgba(0,0,0,0.05)");
      lg.addColorStop(0.32, "rgba(255,255,255,0.16)");
      lg.addColorStop(0.42, "rgba(255,255,255,0.02)");
      lg.addColorStop(0.82, "rgba(0,0,0,0.12)");
      lg.addColorStop(1, "rgba(0,0,0,0.7)");
      g.fillStyle = lg;
      g.fillRect(cx - rTop, topY, rTop * 2, botY - topY);
      g.restore();
    }
  }, [wrapArt, photo]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Spin loop
  useEffect(() => {
    if (!spinning) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      rotRef.current += dt * 0.0012;
      draw();
      if (spinRef.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinning, draw]);

  const turn = (deg: number) => {
    setSpinning(false);
    rotRef.current += (deg * Math.PI) / 180;
    draw();
  };
  const front = () => {
    setSpinning(false);
    rotRef.current = 0;
    draw();
  };

  // Drag to rotate
  const dragX = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
    setSpinning(false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragX.current === null) return;
    rotRef.current -= (e.clientX - dragX.current) * 0.012;
    dragX.current = e.clientX;
    draw();
  };
  const onUp = () => {
    dragX.current = null;
  };

  function pickFile(f: File) {
    uploadDesign(f, setUpload, { requirePreviewable: true });
  }

  async function submit(goCart: boolean) {
    if (!canBuy || !variant) return;
    setBusy(true);
    setToast(null);
    try {
      front();
      const extra: Record<string, string> = {
        "Engraving Artwork File": upload.fileUrl as string,
        Finish: finish,
        "Artwork Size": `${scale}% of wrap area`,
      };
      if (upload.file?.name) extra["Engraving Artwork Filename"] = upload.file.name;
      if (notes.trim()) extra["Instructions"] = notes.trim();

      let thumb = "🥤";
      const cv = canvasRef.current;
      if (cv) {
        try {
          const blob: Blob | null = await new Promise((res) =>
            cv.toBlob((b) => res(b), "image/png"),
          );
          if (blob) {
            extra["Mockup Preview"] = await uploadFlattenedDesign(blob, "cup-mockup.png");
          }
          const small = document.createElement("canvas");
          small.width = 96;
          small.height = 168;
          small.getContext("2d")?.drawImage(cv, 0, 0, 96, 168);
          thumb = small.toDataURL("image/jpeg", 0.7);
        } catch {
          /* mockup is a nice-to-have; the artwork file is what matters */
        }
      }

      const unit = total / qtyNum;
      const item: Omit<ProductCartItem, "id" | "addedAt"> = {
        kind: "product",
        title: product.title,
        subtitle: `${finish} · ${qtyValue}`,
        thumbnail: thumb,
        unitLabel: `$${unit.toFixed(2)} each`,
        totalPrice: total,
        quantity: 1,
        variantId: variant.id,
        productTitle: product.title,
        selectedOptions: {
          [FINISH_OPT]: finish,
          [QTY_OPT]: qtyValue,
        },
        qty: 1,
        unitPrice: total,
        extraProperties: extra,
        editHref: "/products/engraved-cups",
      };
      addItem(item);
      successFeedback();
      if (goCart) {
        router.push("/cart");
        return;
      }
      setBusy(false);
      setTimeout(openCartDrawer, 400);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const eachNow = total / qtyNum;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
          Made in Stuart, FL
        </p>
        <h1 className="font-headline text-2xl font-bold sm:text-3xl">
          Custom Engraved &amp; Color Tumblers
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          20oz insulated steel tumbler with lid. Upload your logo, see it on the cup.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        {/* COL 1 */}
        <div className="space-y-5">
          <Card n={1} title="Pick your finish">
            <div className="grid grid-cols-2 gap-2">
              {FINISHES.map((f) => {
                const on = finish === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFinish(f.name)}
                    className={`rounded-xl border p-3 text-left transition ${
                      on
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border-soft bg-white/4 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`mb-2 h-8 rounded-md ${
                        f.name === "UV Full Color"
                          ? "bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400"
                          : "bg-gradient-to-r from-zinc-300 to-zinc-500"
                      }`}
                    />
                    <div className="text-sm font-bold">{f.title}</div>
                    <div className="text-[11px] leading-snug text-foreground-muted">
                      {f.blurb}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card n={2} title="Quantity">
            <div className="space-y-1.5">
              {tiers.map((t) => {
                const on = qtyValue === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setQtyValue(t.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${
                      on
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border-soft bg-white/4 hover:bg-white/8"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {t.qty} {t.qty === 1 ? "cup" : "cups"}
                      </span>
                      {t.save > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Save {t.save}%
                        </span>
                      )}
                    </span>
                    <span className="text-right leading-tight">
                      <span className="block text-sm font-bold">${t.price.toFixed(2)}</span>
                      <span className="block text-[11px] text-foreground-muted">
                        ${t.each.toFixed(2)} each
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              Need more than 24?{" "}
              <Link href="/contact" className="text-accent underline">
                Get a bulk quote
              </Link>
              .
            </p>
          </Card>
        </div>

        {/* COL 2 */}
        <div className="space-y-5">
          <Card n={3} title="Upload your design">
            <UploadBox
              slot={upload}
              onSelect={pickFile}
              onClear={() => setUpload(EMPTY_UPLOAD_SLOT)}
              accept={ACCEPT_PREVIEWABLE_DESIGN_FILES}
              hint="PNG · JPG · SVG · PDF"
            />
            <p className="mt-2 text-xs text-foreground-muted">
              {finish === "Laser Engraved"
                ? "Best: black logo on a clear or white background. Engraving is one tone."
                : "Best: a high-resolution PNG with a clear background."}
            </p>
          </Card>

          {hasFile && (
            <Card title="Size on cup">
              <input
                type="range"
                min={30}
                max={100}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-[#d9f000]"
                aria-label="Design size"
              />
              <div className="mt-1 flex justify-between text-[11px] text-foreground-muted">
                <span>Smaller</span>
                <span>{scale}%</span>
                <span>Bigger</span>
              </div>
            </Card>
          )}

          <ul className="grid grid-cols-2 gap-2 text-xs text-foreground-muted">
            {[
              "20oz stainless steel",
              "Keeps drinks cold or hot",
              "Lid included",
              "Made in Stuart, FL",
            ].map((t) => (
              <li key={t} className="rounded-lg border border-border-soft bg-white/4 px-3 py-2">
                ✓ {t}
              </li>
            ))}
          </ul>

          <details className="rounded-lg border border-border-soft bg-white/4 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-foreground-muted">
              ＋ Add a note (optional)
            </summary>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-2 w-full rounded-md border border-border-soft bg-black/30 p-2 text-sm"
              placeholder="Anything we should know?"
            />
          </details>
        </div>

        {/* COL 3 */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border-soft bg-gradient-to-b from-white/8 to-white/2 p-3">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground-muted">
                Live preview
              </span>
              <span className="text-[11px] text-foreground-muted">
                Wrap area {WRAP_W_IN}&quot; × {WRAP_H_IN}&quot;
              </span>
            </div>
            <canvas
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="mx-auto block h-auto w-full max-w-[380px] cursor-grab touch-pan-y select-none active:cursor-grabbing"
              style={{ aspectRatio: `${CV_W} / ${CV_H}` }}
              aria-label="Tumbler preview. Drag to turn."
            />
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <Ctl onClick={() => turn(-35)}>← Turn</Ctl>
              <Ctl onClick={front}>Front</Ctl>
              <Ctl onClick={() => setSpinning((s) => !s)} active={spinning}>
                {spinning ? "Stop" : "Spin"}
              </Ctl>
              <Ctl onClick={() => turn(35)}>Turn →</Ctl>
            </div>
            <p className="mt-2 text-center text-[11px] text-foreground-muted">
              Drag the cup to turn it. Preview only — final look may vary slightly.
            </p>
          </div>

          <div className="rounded-2xl border border-border-soft bg-white/4 p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-foreground-muted">
                  Total
                </div>
                <div className="font-headline text-3xl font-bold">${total.toFixed(2)}</div>
              </div>
              <div className="text-right text-xs text-foreground-muted">
                {qtyNum} × ${eachNow.toFixed(2)}
                <br />
                {finish}
              </div>
            </div>
            <button
              id="buy-button"
              type="button"
              onClick={() => submit(true)}
              disabled={!canBuy}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider transition ${
                canBuy
                  ? "accent-gradient text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110"
                  : "cursor-not-allowed border border-border-soft bg-white/4 text-foreground-muted"
              }`}
            >
              {busy
                ? "Preparing…"
                : upload.isUploading
                  ? "Uploading…"
                  : !hasFile
                    ? "⬆ Upload design to continue"
                    : `Buy now · $${total.toFixed(2)}`}
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={!canBuy}
              className="mt-2 w-full rounded-md border border-border-soft bg-white/4 px-6 py-3 text-xs font-bold uppercase tracking-wider transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🛒 Add to cart
            </button>
            {toast && <p className="mt-2 text-xs text-red-300">{toast}</p>}
            <p className="mt-2 text-center text-[11px] text-foreground-muted">
              Shipping and tax shown at checkout.
            </p>
          </div>
        </div>
      </div>

      <MobileBuyBar total={total} targetId="buy-button" label="Review order" />
    </div>
  );
}

function Card({
  n,
  title,
  children,
}: {
  n?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-soft bg-white/4 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-headline text-sm font-bold uppercase tracking-wider">
        {n && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-black">
            {n}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Ctl({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-2 text-xs font-bold transition ${
        active
          ? "border-accent bg-accent/15"
          : "border-border-soft bg-white/4 hover:bg-white/8"
      }`}
    >
      {children}
    </button>
  );
}
