// pdfjs-dist references browser-only globals (DOMMatrix) at module-evaluation
// time, which crashes if it's ever loaded during Next.js's server-side render
// pass. This file is only ever invoked from a browser event handler (see
// uploadDesign in UploadBox.tsx), so the library is loaded lazily via dynamic
// import inside the function below — never at this module's top level —
// to guarantee it's never evaluated on the server.

// Render at 300 DPI (PDF page units are in points, 72 per inch) — matches
// the "High" quality threshold the Fit Studio already checks designs
// against, so a print-ready PDF renders sharp at the studio's zoom range.
const TARGET_DPI = 300;
// Safety cap so a huge-format PDF (e.g. a banner sized in feet) can't render
// an enormous canvas and hang/crash the tab.
const MAX_CANVAS_DIMENSION_PX = 6000;

let workerConfigured = false;
function ensureWorker(pdfjsLib: typeof import("pdfjs-dist")) {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  workerConfigured = true;
}

export function isPdfFile(f: File): boolean {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

/**
 * Renders page 1 of a PDF to a PNG File, so it can flow through the same
 * upload/preview/flatten pipeline as any other image — the Fit Studio (and
 * the final print export) only ever deal with raster images via <img>/
 * canvas, which can't display a PDF directly.
 */
export async function renderPdfFirstPageToFile(file: File): Promise<File> {
  const pdfjsLib = await import("pdfjs-dist");
  ensureWorker(pdfjsLib);

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  const scale = TARGET_DPI / 72;
  let viewport = page.getViewport({ scale });
  const longestSide = Math.max(viewport.width, viewport.height);
  if (longestSide > MAX_CANVAS_DIMENSION_PX) {
    viewport = page.getViewport({ scale: scale * (MAX_CANVAS_DIMENSION_PX / longestSide) });
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't render PDF previews");

  const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
  await renderTask.promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to export the rendered PDF page"))),
      "image/png",
    );
  });

  const newName = file.name.replace(/\.pdf$/i, "") + ".png";
  return new File([blob], newName, { type: "image/png" });
}
