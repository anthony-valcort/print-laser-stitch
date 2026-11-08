"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WRAP_TEMPLATES, type WrapTemplate } from "@/lib/wrap-templates";
import WrapEditor from "./WrapEditor";
import { buildSheet, makeTemplate, parseVector, type BuildResult, type Parsed } from "./wrap-import";
import {
  downloadUrl,
  sheetSvg,
  jpegToPdf,
  loadDraft,
  loadSaved,
  parseSheet,
  renderSheet,
  writeDraft,
  writeSaved,
  uid,
  type Design,
  type SavedDesign,
  type SheetSrc,
} from "./wrap-model";

type Step = "vehicle" | "design" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "vehicle", label: "Vehicle" },
  { key: "design", label: "Design" },
  { key: "review", label: "Review & download" },
];
const EMPTY: Design = { color: "#ffffff", layers: [] };
type VKind = "truck" | "suv" | "sedan" | "van";
const kindOf = (c: string): VKind => (c === "Trucks" ? "truck" : c === "Sedans" ? "sedan" : c === "Vans" ? "van" : "suv");
const BODY: Record<VKind, string> = {
  sedan: "M3 23V19Q3 17 6 16.5L16 15L23 9Q25 8 28 8H40Q43 8 45 10L50 15L58 16.5Q61 17.5 61 20V23Z",
  suv: "M3 23V17Q3 15 6 14.5L12 13L17 7Q18 6 20 6H46Q49 6 51 9L55 14L58 15Q61 16 61 19V23Z",
  van: "M3 23V9Q3 6 6 6H44Q47 6 49 9L55 15L58 16Q61 17 61 20V23Z",
  truck: "M3 23V15H27V9Q27 7 29 7H39Q42 7 44 10L48 15H58Q61 16 61 19V23Z",
};
const WIN: Record<VKind, string> = {
  sedan: "M26 10.5H31V15H21ZM34 10.5H40Q42 10.5 43.5 12L46 15H34Z",
  suv: "M21 8H31V14H15ZM34 8H45Q46.5 8 47.5 10L50.5 14H34Z",
  van: "M40 8H44Q45.5 8 46.5 9.5L50 14H40ZM8 8H18V13H8ZM21 8H31V13H21Z",
  truck: "M30 9H38Q40 9 41.5 11L44 14H30Z",
};
function VehicleIcon({ kind, className = "h-8 w-auto" }: { kind: VKind; className?: string }) {
  return (
    <svg viewBox="0 0 64 30" className={className} aria-hidden="true">
      <path d={BODY[kind]} fill="currentColor" />
      <path d={WIN[kind]} fill="#050505" opacity="0.85" />
      <circle cx="16" cy="23.5" r="4.6" fill="#050505" stroke="currentColor" strokeWidth="2" />
      <circle cx="48" cy="23.5" r="4.6" fill="#050505" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
const BRAND_COLOR: Record<string, string> = { Ford: "#2f6bff", Toyota: "#eb0a1e", Jeep: "#6fae3c", Tesla: "#e82127", Hummer: "#d9a400", "Mercedes-Benz": "#9aa3ad", Custom: "#d94cb3" };

const btn =
  "inline-flex h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white transition hover:border-[#18d3e8]/60";
const field = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white";

export default function WrapDesigner() {
  const [step, setStep] = useState<Step>("vehicle");
  const [tpl, setTpl] = useState<WrapTemplate | null>(null);
  const [src, setSrc] = useState<SheetSrc | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [design, setDesign] = useState<Design>(EMPTY);
  const [editorKey, setEditorKey] = useState(0);
  const [saved, setSaved] = useState<SavedDesign[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [sent, setSent] = useState<"" | "sending" | "ok" | string>("");
  const [fb, setFb] = useState(false);
  const designRef = useRef(design);
  designRef.current = design;
  const cache = useRef(new Map<string, SheetSrc>());
  const [custom, setCustom] = useState<WrapTemplate[]>([]);
  const [imp, setImp] = useState<{ name: string; parsed: Parsed; built: BuildResult; format: string; preview: string } | null>(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impErr, setImpErr] = useState("");
  const tplFile = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const openTemplate = useCallback(async (t: WrapTemplate, d: Design = EMPTY) => {
    setLoading(true);
    setLoadErr("");
    try {
      let s = cache.current.get(t.id);
      if (!s) {
        const res = await fetch(t.sheetUrl);
        if (!res.ok) throw new Error("load");
        s = parseSheet(await res.text());
        cache.current.set(t.id, s);
      }
      setTpl(t);
      setSrc(s);
      setDesign(d);
      setEditorKey((k) => k + 1);
      setStep("design");
    } catch {
      setLoadErr("Couldn't load that template. Please try again.");
    }
    setLoading(false);
  }, []);

  // autosave draft (debounced)
  useEffect(() => {
    if (!tpl) return;
    const t = setTimeout(() => writeDraft(tpl.id, design), 600);
    return () => clearTimeout(t);
  }, [tpl, design]);

  const draft = typeof window !== "undefined" ? loadDraft() : null;
  const [cat, setCat] = useState("All");
  const [brand, setBrand] = useState("All");
  const allT = [...custom, ...WRAP_TEMPLATES];
  const catList = ["Trucks", "SUVs & Crossovers", "Sedans", "Vans"];
  const catsAll = ["All", ...catList, ...Array.from(new Set(allT.map((t) => t.category))).filter((c) => !catList.includes(c))];
  const inCat = allT.filter((t) => cat === "All" || t.category === cat);
  const brands = ["All", ...Array.from(new Set(inCat.map((t) => t.make))).sort()];
  const brandNow = brands.includes(brand) ? brand : "All";
  const shown = inCat.filter((t) => brandNow === "All" || t.make === brandNow);
  const draftTpl = draft ? WRAP_TEMPLATES.find((t) => t.id === draft.tplId) : undefined;

  const save = () => {
    if (!tpl) return;
    const name = window.prompt("Name this design", `${tpl.model} design`);
    if (!name) return;
    const list = [{ id: uid(), name: name.slice(0, 60), tplId: tpl.id, savedAt: Date.now(), design: designRef.current }, ...loadSaved()].slice(0, 12);
    if (writeSaved(list)) {
      setSaved(list);
      flash("Saved to this browser");
    } else flash("Couldn't save: browser storage is full. Download a PNG instead.");
  };

  const removeSaved = (id: string) => {
    const list = loadSaved().filter((d) => d.id !== id);
    writeSaved(list);
    setSaved(list);
  };

  const goReview = async () => {
    if (!src) return;
    setStep("review");
    setSent("");
    setPreview("");
    try {
      const r = await renderSheet(src, designRef.current, { width: 1800, keepOnBody: true, lines: true, labels: true }, "image/jpeg", 0.88);
      setPreview(r.dataUrl);
    } catch {
      setPreview("");
    }
  };

  const dlPng = async () => {
    if (!src || !tpl) return;
    const r = await renderSheet(src, design, { width: 3600, keepOnBody: true, lines: true, labels: true }, "image/png");
    downloadUrl(r.dataUrl, `wrap-design-${tpl.id}.png`);
  };
  const dlPdf = async () => {
    if (!src || !tpl) return;
    const r = await renderSheet(src, design, { width: 3000, keepOnBody: true, lines: true, labels: true }, "image/jpeg", 0.92);
    const blob = jpegToPdf(r.dataUrl, r.width, r.height, Math.round(src.vb[2]), Math.round(src.vb[3]));
    const url = URL.createObjectURL(blob);
    downloadUrl(url, `wrap-design-${tpl.id}.pdf`);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const summary = () => {
    const parts = [`body ${design.color}`];
    const t = design.layers.filter((l) => l.type === "text" && !l.hidden).map((l) => `"${l.text}"`);
    const n = design.layers.filter((l) => !l.hidden).length;
    parts.push(`${n} layer${n === 1 ? "" : "s"}`);
    if (t.length) parts.push(`text: ${t.slice(0, 6).join(", ")}`);
    return parts.join("; ");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!src || !tpl) return;
    setSent("sending");
    try {
      const r = await renderSheet(src, design, { width: 2400, keepOnBody: true, lines: true, labels: false }, "image/jpeg", 0.85);
      const res = await fetch("/api/wrap-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vehicle: tpl.label, bodyColor: design.color, summary: summary(), images: [{ view: "sheet", dataUrl: r.dataUrl }] }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setSent(res.ok ? "ok" : j.error || "Something went wrong. Please call (772) 985-2854.");
    } catch {
      setSent("Something went wrong. Please call (772) 985-2854.");
    }
  };

  const previewFor = (b: BuildResult) => {
    const s = parseSheet(b.svg);
    const svg = sheetSvg(s, { color: "#e9edf2", layers: [] }, { width: 1100, keepOnBody: true, lines: true, labels: true });
    return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  };

  const rebuild = (parsed: Parsed, name: string, glass?: number[]) => {
    const built = buildSheet(parsed, glass ? { glass } : {});
    setImp((old) => {
      if (old?.preview) URL.revokeObjectURL(old.preview);
      return { name, parsed, built, format: parsed.format, preview: previewFor(built) };
    });
  };

  const onTemplateFile = async (f: File | undefined) => {
    if (!f) return;
    setImpErr("");
    setImpBusy(true);
    try {
      if (f.size > 60 * 1024 * 1024) throw new Error("That file is over 60 MB.");
      const parsed = await parseVector(new Uint8Array(await f.arrayBuffer()));
      rebuild(parsed, f.name);
    } catch (e) {
      setImpErr(e instanceof Error ? e.message : "Couldn't read that file.");
    }
    setImpBusy(false);
    if (tplFile.current) tplFile.current.value = "";
  };

  const useImported = () => {
    if (!imp) return;
    const id = `custom-${uid()}`;
    const t = makeTemplate(imp.name, id, imp.built, `blob:${id}`);
    cache.current.set(id, parseSheet(imp.built.svg));
    setCustom((c) => [t, ...c]);
    setImp(null);
    openTemplate(t);
  };

  const downloadSheet = () => {
    if (!imp) return;
    const url = URL.createObjectURL(new Blob([imp.built.svg], { type: "image/svg+xml" }));
    downloadUrl(url, "sheet.svg");
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <section data-no-buddy className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-5">
        <p className="font-headline text-xs uppercase tracking-widest text-[#18d3e8]">Experimental preview</p>
        <h1 className="font-display mt-1 text-3xl sm:text-4xl">Vehicle Wrap Designer</h1>
      </div>

      <ol className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
        {STEPS.map((s, i) => {
          const reachable = i === 0 || (i === 1 && !!tpl) || (i === 2 && !!tpl);
          return (
            <li key={s.key} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => (s.key === "review" ? goReview() : setStep(s.key))}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${i === stepIdx ? "accent-gradient text-black" : "bg-white/5 text-white/70"} disabled:opacity-40`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-black/30 text-[10px] text-white">{i + 1}</span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="text-white/30">›</span>}
            </li>
          );
        })}
      </ol>

      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#d9f000] px-5 py-2 text-sm font-bold text-black shadow-lg">{toast}</div>}

      {step === "vehicle" && (
        <div>
          <h2 className="font-display text-2xl">Choose your vehicle</h2>
          {draftTpl && draft && (
            <button type="button" className={btn + " mb-4"} onClick={() => openTemplate(draftTpl, draft.design)}>
              Resume your last design ({draftTpl.model})
            </button>
          )}
                    <div className="mb-3 grid grid-cols-5 gap-2">
            {catsAll.slice(0, 5).map((c) => {
              const on = cat === c;
              return (
                <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={on} className={"flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition " + (on ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]" : "border-white/10 bg-surface text-white/70")}>
                  {c === "All" ? <span className="flex h-7 items-center text-lg font-black">★</span> : <VehicleIcon kind={kindOf(c)} className="h-8 w-auto" />}
                  <span className="text-[11px] font-bold uppercase leading-tight">{c === "SUVs & Crossovers" ? "SUVs" : c}</span>
                  
                </button>
              );
            })}
          </div>
          <div className="relative mb-3">
            <div className="flex snap-x gap-2 overflow-x-auto pb-1 pr-10 [scrollbar-width:none]">
              {brands.map((o) => (
                <button key={o} type="button" onClick={() => setBrand(o)} aria-pressed={brandNow === o} className={"flex shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition " + (brandNow === o ? "border-[#18d3e8] bg-[#18d3e8]/15 text-[#18d3e8]" : "border-white/15 text-white/75")}>
                  {o !== "All" && <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: BRAND_COLOR[o] ?? "#555" }}>{o[0]}</span>}
                  {o === "All" ? "All brands" : o}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-background to-transparent pr-1 text-white/60" aria-hidden="true">›</div>
          </div>
          {shown.length === 0 && (
            <button type="button" className={btn} onClick={() => { setCat("All"); setBrand("All"); }}>Show all vehicles</button>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {shown.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTemplate(t)}
                disabled={loading}
                className="flex flex-col rounded-xl border border-white/10 bg-surface p-3 text-left transition active:scale-[0.98] hover:border-[#18d3e8]/60"
              >
                <span className="flex h-16 items-center justify-center rounded-lg bg-white p-1.5 text-black">
                  {t.id.startsWith("custom-") ? <VehicleIcon kind={kindOf(t.category)} className="h-9 w-auto" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/wrap/thumbs/${t.id}.png`} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />}
                </span>
                <span className="mt-2 inline-block self-start rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: BRAND_COLOR[t.make] ?? "#555" }}>{t.make === "Mercedes-Benz" ? "Mercedes" : t.make}</span>
                <span className="mt-2 block text-base font-bold leading-tight">{t.make === "Custom" ? t.label : `${t.year} ${t.model}`}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-[#d94cb3]/50 bg-[#d94cb3]/5 p-4">
            <p className="font-headline text-xs uppercase tracking-widest text-[#d94cb3]">Add your own template</p>
            
            <button type="button" className={btn + " mt-3"} disabled={impBusy} onClick={() => tplFile.current?.click()}>
              {impBusy ? "Building template…" : "Upload template (.eps, .ai, .pdf)"}
            </button>
            <input ref={tplFile} type="file" accept=".eps,.ai,.pdf,application/pdf,application/postscript,application/illustrator" className="hidden" onChange={(e) => onTemplateFile(e.target.files?.[0])} />
            {impErr && <p className="mt-3 text-sm text-[#ff9aa2]">{impErr}</p>}
          </div>
          {loading && <p className="mt-4 text-sm text-white/70">Loading template…</p>}
          {loadErr && <p className="mt-4 text-sm text-[#ff9aa2]">{loadErr}</p>}
          {saved.length > 0 && (
            <button type="button" className={btn + " mt-4"} onClick={() => setShowSaved(true)}>My designs ({saved.length})</button>
          )}
        </div>
      )}

      {step === "design" && tpl && src && (
        <WrapEditor
          key={editorKey}
          tpl={tpl}
          src={src}
          initial={design}
          onChange={setDesign}
          onContinue={goReview}
          onChangeVehicle={() => setStep("vehicle")}
          onSave={save}
          onOpenDesigns={() => setShowSaved(true)}
          onFeedback={() => setFb(true)}
        />
      )}

      {step === "review" && tpl && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your wrap design on all sides of the vehicle" className="block h-auto w-full" />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-black/50">Rendering preview…</div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => setStep("design")}>← Back to editing</button>
              <button type="button" className={btn} onClick={dlPng}>Download PNG</button>
              <button type="button" className={btn} onClick={dlPdf}>Download PDF</button>
              <button type="button" className={btn} onClick={save}>Save</button>
            </div>
            <p className="mt-3 text-xs text-white/45">This is a visual impression, not a production proof. We&apos;ll confirm sizes, colors and placement with you before anything is printed.</p>
          </div>

          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-surface p-4">
            <h2 className="font-display text-xl">Request a wrap quote</h2>
            <p className="text-sm text-white/65">{tpl.make === "Custom" ? tpl.label : `${tpl.year} ${tpl.make} ${tpl.model}`}. We&apos;ll get back to you with pricing.</p>
            <input required className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            <input required type="email" className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            <input className={field} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            <textarea className={field} rows={4} placeholder="Notes: coverage (full, partial, spot graphics), timing, fleet size…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button disabled={sent === "sending"} className="accent-gradient h-11 w-full rounded-full text-sm font-bold uppercase tracking-wide text-black disabled:opacity-60">
              {sent === "sending" ? "Sending…" : "Send my design"}
            </button>
            {sent === "ok" && <p className="text-sm text-[#d9f000]">Sent! We&apos;ll be in touch soon. 💛</p>}
            {sent && sent !== "ok" && sent !== "sending" && <p className="text-sm text-[#ff9aa2]">{sent}</p>}
          </form>
        </div>
      )}

      {imp && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/75 p-4" onClick={() => setImp(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#14141c] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl">Template built</h3>
            <p className="mt-1 text-sm text-white/65">{imp.name} · {imp.format} · {imp.built.stats.views} views found · {imp.built.stats.bodyPaths} body panels</p>
            <div className="mt-3 overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imp.preview} alt="Built template preview" className="block h-auto w-full" />
            </div>
            <p className="mt-3 text-xs text-white/60">
              Detected: {imp.built.views.map((v) => `${v.label} (${(v.w * 20 / 72).toFixed(0)}" × ${(v.h * 20 / 72).toFixed(0)}")`).join(" · ")}. Assumes the file is drawn at 1:20 scale.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/70">Window / glass shade:</span>
              <button type="button" onClick={() => rebuild(imp.parsed, imp.name, [])} className={`${btn} h-8 ${imp.built.glass.length === 0 ? "border-[#d9f000]/70" : ""}`}>None</button>
              {imp.built.glassCandidates.map((g) => (
                <button key={g} type="button" onClick={() => rebuild(imp.parsed, imp.name, [g])} className={`${btn} h-8 gap-2 ${imp.built.glass.includes(g) ? "border-[#d9f000]/70" : ""}`}>
                  <span className="h-4 w-4 rounded border border-white/30" style={{ background: `rgb(${g},${g},${g})` }} />
                  {g}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="accent-gradient inline-flex h-11 items-center rounded-full px-6 text-sm font-bold uppercase tracking-wide text-black" onClick={useImported}>Use this template</button>
              <button type="button" className={btn + " h-11"} onClick={downloadSheet}>Download sheet.svg</button>
              <button type="button" className={btn + " h-11"} onClick={() => setImp(null)}>Cancel</button>
            </div>
            <p className="mt-3 text-[11px] text-white/45">Imported templates stay in this browser session. To add one permanently for every visitor, send us the sheet.svg and we&apos;ll add it to the vehicle list.</p>
          </div>
        </div>
      )}

      {showSaved && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setShowSaved(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl border border-white/15 bg-[#14141c] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl">My designs</h3>
              <button type="button" onClick={() => setShowSaved(false)} aria-label="Close" className="text-white/60">✕</button>
            </div>
            {saved.length === 0 && <p className="text-sm text-white/55">Nothing saved yet. Designs are stored in this browser for 90 days.</p>}
            <ul className="space-y-2">
              {saved.map((d) => {
                const t = WRAP_TEMPLATES.find((x) => x.id === d.tplId);
                return (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{d.name}</b>
                      <span className="text-xs text-white/50">{t?.model} · {new Date(d.savedAt).toLocaleDateString()}</span>
                    </span>
                    <button type="button" className={btn + " h-8"} disabled={!t} onClick={() => { setShowSaved(false); if (t) openTemplate(t, d.design); }}>Open</button>
                    <button type="button" className={btn + " h-8"} onClick={() => removeSaved(d.id)} aria-label="Delete design">✕</button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {fb && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setFb(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#14141c] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl">Feedback</h3>
            <p className="mt-2 text-sm text-white/70">This tool is in preview. Tell us what&apos;s missing or broken: call or text (772) 985-2854 or email info@printlaserstitch.com.</p>
            <button type="button" className={btn + " mt-4"} onClick={() => setFb(false)}>Close</button>
          </div>
        </div>
      )}
    </section>
  );
}
