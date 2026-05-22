import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActivateAccountForm from "@/components/ActivateAccountForm";

export const metadata: Metadata = {
  title: "Activate account · Print Laser Stitch",
  description:
    "Set your password to activate your Print Laser Stitch account.",
};

type Params = Promise<{ id: string; token: string }>;

/**
 * Landing page for the link in Shopify's "Customer account activation" email
 * (sent when an admin creates a customer, or when checkout creates an account
 * that still needs a password). Shopify generates the URL on our primary
 * domain as `/account/activate/{customerId}/{activationToken}`; we hand the
 * params to the form which posts to /api/auth/activate.
 */
export default async function ActivateAccountPage({
  params,
}: {
  params: Params;
}) {
  const { id, token } = await params;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <ActivateAccountForm id={id} token={token} />
      </main>
      <Footer />
    </>
  );
}
