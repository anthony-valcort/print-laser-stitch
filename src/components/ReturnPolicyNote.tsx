/**
 * Return terms shown under every product.
 *
 * Custom-decorated goods can't be resold, so they're final sale — but the
 * customer needs to see, at the same moment, that this is about the design
 * being theirs and not about the shop dodging its own mistakes. Both halves
 * are stated plainly and side by side.
 */
export default function ReturnPolicyNote() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="grid gap-3 rounded-2xl border border-border-soft bg-white/[0.03] p-5 sm:grid-cols-2 sm:gap-5">
        <div>
          <h2 className="flex items-center gap-2 font-headline text-xs font-bold uppercase tracking-[0.16em] text-foreground">
            <span aria-hidden>🧵</span>
            Custom items are final sale
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            Everything here is made to your order — your artwork, your colors,
            your sizes — so it can&apos;t be restocked or resold. That means
            custom orders aren&apos;t returnable or exchangeable for things like
            a change of mind, a wrong size you selected, or artwork approved
            before production.
          </p>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-headline text-xs font-bold uppercase tracking-[0.16em] text-[#d9f000]">
            <span aria-hidden>✅</span>
            Our mistakes are on us
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            If we get it wrong, we make it right. Misprints, peeling or cracked
            prints, embroidery that doesn&apos;t meet our standard, the wrong
            item or size on our end, or damage in production — we&apos;ll
            reprint or refund it. Contact us within{" "}
            <strong className="text-foreground">7 days</strong> of delivery with
            a photo and we&apos;ll sort it out.
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-foreground-muted">
        Questions before you order?{" "}
        <a
          href="mailto:info@printlaserstitch.com"
          className="font-semibold text-[#18d3e8] hover:underline"
        >
          info@printlaserstitch.com
        </a>{" "}
        ·{" "}
        <a
          href="tel:+17729852854"
          className="font-semibold text-[#18d3e8] hover:underline"
        >
          (772) 985-2854
        </a>
      </p>
    </section>
  );
}
