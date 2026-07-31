"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProofModal, {
  type ProofApprovalData,
} from "@/components/proof/ProofModal";
import type { ProofShape, RoundedCorners } from "@/lib/proof/types";

/** Bridge page opened inside the mobile app's in-app browser. The app has
 * no DOM <canvas> to run the Proof Studio itself, so it hands off to this
 * page (same ProofModal the desktop site uses — background removal runs in
 * the customer's browser here too, no server AI cost) and gets the result
 * back via a redirect to the app's own URL scheme. */
export default function MobileProofPage() {
  return (
    <Suspense fallback={null}>
      <MobileProofBody />
    </Suspense>
  );
}

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
};

async function uploadBlobToShopify(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<string | undefined> {
  try {
    const stageResp = await fetch("/api/shopify-upload/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mimeType, fileSize: blob.size }),
    });
    const stage = (await stageResp.json()) as
      | StagedTarget
      | { error: string };
    if (!stageResp.ok || "error" in stage) return undefined;

    const fd = new FormData();
    for (const param of stage.parameters) fd.append(param.name, param.value);
    fd.append("file", blob, filename);
    const up = await fetch(stage.url, { method: "POST", body: fd });
    if (!up.ok) return undefined;

    const regResp = await fetch("/api/shopify-upload/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceUrl: stage.resourceUrl,
        filename,
        mimeType,
      }),
    });
    const reg = (await regResp.json()) as
      | { fileId: string; url: string }
      | { error: string };
    if (!regResp.ok || "error" in reg) return undefined;
    return reg.url;
  } catch {
    return undefined;
  }
}

function MobileProofBody() {
  const params = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const imageUrl = params.get("imageUrl") ?? "";
  const scheme = params.get("scheme") ?? "";
  const shape = (params.get("shape") ?? "custom") as ProofShape;
  const rounded = (params.get("rounded") ?? "none") as RoundedCorners;
  const widthIn = Number(params.get("widthIn")) || 3;
  const heightIn = Number(params.get("heightIn")) || 3;

  useEffect(() => {
    if (!imageUrl) {
      setLoadError("Missing design image.");
      return;
    }
    let cancelled = false;
    fetch(imageUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load design (${r.status})`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const name = imageUrl.split("/").pop()?.split("?")[0] || "design.png";
        setFile(new File([blob], name, { type: blob.type || "image/png" }));
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load design.");
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  function returnToApp(query: Record<string, string>) {
    const qs = new URLSearchParams(query).toString();
    window.location.href = `${scheme}?${qs}`;
  }

  async function finalize(data: ProofApprovalData, changeNote?: string) {
    setFinishing(true);
    try {
      const stamp = Date.now();
      const [proofUrl, cutlineUrl] = await Promise.all([
        uploadBlobToShopify(data.proofPng, `proof-${stamp}.png`, "image/png"),
        uploadBlobToShopify(
          new Blob([data.cutlineSvg], { type: "image/svg+xml" }),
          `cutline-${stamp}.svg`,
          "image/svg+xml",
        ),
      ]);
      returnToApp({
        status: changeNote ? "changes-requested" : "approved",
        proofUrl: proofUrl ?? "",
        cutlineUrl: cutlineUrl ?? "",
        shape: data.shape,
        borderThickness: data.borderThickness,
        roundedCorners: data.roundedCorners,
        removedBackground: String(data.removedBackground),
        lowResolution: String(data.lowResolution),
        ...(changeNote ? { changeNote } : {}),
      });
    } catch {
      setFinishing(false);
      setLoadError("Could not finalize the proof. Please try again.");
    }
  }

  if (loadError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm text-rose-300">{loadError}</p>
          <button
            type="button"
            onClick={() => returnToApp({ status: "cancelled" })}
            className="mt-4 rounded-full border border-border-soft px-5 py-2 text-sm text-foreground-muted"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!file || finishing) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {finishing ? "Saving your proof…" : "Loading your design…"}
        </div>
      </div>
    );
  }

  return (
    <ProofModal
      open
      file={file}
      initialShape={shape}
      initialBorder="normal"
      initialRounded={rounded}
      widthIn={widthIn}
      heightIn={heightIn}
      onClose={() => returnToApp({ status: "cancelled" })}
      onApprove={(data) => void finalize(data)}
      onRequestChanges={(note, data) => void finalize(data, note)}
    />
  );
}
