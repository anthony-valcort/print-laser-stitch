import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountBreadcrumb from "@/components/account/AccountBreadcrumb";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Change Password · Print Laser Stitch",
  description: "Update your account password.",
};

export default async function ChangePasswordPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account/change-password");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <AccountBreadcrumb current="Change Password" />
        <h1 className="text-3xl font-bold tracking-tight">Change Password</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Choose a new password for {customer.email}.
        </p>

        <ChangePasswordForm />
      </main>
      <Footer />
    </>
  );
}
