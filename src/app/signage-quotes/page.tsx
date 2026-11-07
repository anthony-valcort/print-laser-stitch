import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageCopy from "@/components/PageCopy";
import SignDecalBuilder from "@/components/sign-builder/SignDecalBuilder";

export const metadata: Metadata = {
  title: "Sign & Decal Builder — Instant Quote | Print Laser Stitch, Stuart FL",
  description:
    "See your window decal, wall graphic, vehicle lettering or sign at real scale and get an instant price — print only, design and print, or full installation. No travel fee in Martin or St. Lucie County.",
  alternates: { canonical: "/signage-quotes" },
};

export default function SignageQuotesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <SignDecalBuilder />
        <PageCopy
          heading="Custom signs and decals in Stuart, FL"
          paragraphs={[
            "Most people have no idea what size to order — so the builder shows you. Pick where it's going (a storefront window, glass door, wall, vehicle or sign board), choose a popular size or drag it to fit, and you'll see it at real scale next to a 5′9″ person, with your wording or logo on it.",
            "Add as many pieces as the job needs, choose print only, design and print, or full installation, and the price updates as you go. For installs we can remove old decals, window film or wraps first, and there's no travel fee anywhere in Martin or St. Lucie County.",
          ]}
          points={[
            { title: "See it before you buy", text: "Real-scale preview with a person for reference, so 24 × 18 inches finally makes sense." },
            { title: "One quote for the whole job", text: "Mix window, door, wall and vehicle pieces in a single order." },
            { title: "Removal handled", text: "Old decals, tint or wraps removed and cleaned before we install the new ones." },
            { title: "Local installers", text: "Free travel in Stuart, Palm City, Jensen Beach, Hobe Sound, Port St. Lucie, Fort Pierce and nearby." },
          ]}
          links={[
            { href: "/wrap-designer", label: "Design a vehicle wrap" },
            { href: "/vehicle-stickers", label: "Vehicle decal kits" },
            { href: "/products/banners", label: "Vinyl banners" },
            { href: "/contact", label: "Talk to us" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
