import type { Metadata } from "next";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalLogin from "@/components/portal/PortalLogin";
import PortalCatalog from "@/components/portal/PortalCatalog";
import {
  getCompanyBySlug,
  portalCookieName,
  toPublic,
  verifyPortalToken,
} from "@/lib/portal-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Portal | Print Laser Stitch",
  robots: { index: false, follow: false },
};

type Params = Promise<{ slug: string }>;

export default async function PortalPage({ params }: { params: Params }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug.slice(0, 80));

  // Same screen whether the link is wrong or the company is switched off,
  // so nobody can use this page to find out which companies exist.
  if (!company || !company.active) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <PortalLogin slug={slug} name="" logoUrl="" missing />
        </main>
        <Footer />
      </>
    );
  }

  const jar = await cookies();
  const signedIn = await verifyPortalToken(
    jar.get(portalCookieName(company.id))?.value,
    company,
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        {signedIn ? (
          <PortalCatalog company={toPublic(company)} />
        ) : (
          <PortalLogin
            slug={company.slug}
            name={company.name}
            logoUrl={company.logoUrl}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
