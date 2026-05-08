import Image from "next/image";

const SIZES = [
  {
    label: 'Small (2")',
    description: "Best for phone cases, helmets, or tight spots",
    image:
      "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628948/StickerShuttle_Helmet_atrvi7.webp",
    alt: "Helmet with small sticker",
  },
  {
    label: 'Medium (3")',
    description: "Great for water bottles, laptops, or notebooks",
    image:
      "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628951/StickerShuttle_Bottle_m6rxb5.webp",
    alt: "Water bottle with medium sticker",
  },
  {
    label: 'Large (4")',
    description: "Commonly used for skateboards, tumblers, or tablets",
    image:
      "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628956/StickerShuttle_Board_150b2de5-5194-4773-b983-0a4f746602a4_cox6gj.webp",
    alt: "Skateboard with large sticker",
  },
  {
    label: 'X-Large (5")',
    description: "Most seen on cars, coolers, fridges, or toolboxes",
    image:
      "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750628960/StickerShuttle_VisitMars_jhm6al.webp",
    alt: "Cooler with x-large sticker",
  },
];

export default function SizeComparison() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Size <span className="accent-gradient-text">Comparison</span>
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Real-world references so you can pick with confidence.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SIZES.map((s) => (
          <div
            key={s.label}
            className="overflow-hidden rounded-2xl border border-border-soft bg-surface"
          >
            <div className="relative aspect-square w-full bg-white/[0.03]">
              <Image
                src={s.image}
                alt={s.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="text-base font-semibold">{s.label}</div>
              <p className="mt-1 text-sm text-foreground-muted">
                {s.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
