import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password · Print Laser Stitch",
  description: "Set a new password for your Print Laser Stitch account.",
};

type Params = Promise<{ id: string; token: string }>;

/**
 * Landing page for the link in Shopify's "Customer account password reset"
 * email. Shopify generates the URL on our primary domain as
 * `/account/reset/{customerId}/{token}` — these become the `id` and `token`
 * route params, which the form posts to /api/auth/reset.
 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Params;
}) {
  const { id, token } = await params;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <ResetPasswordForm id={id} token={token} />
      </main>
      <Footer />
    </>
  );
}
