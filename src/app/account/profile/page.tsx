import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountBreadcrumb from "@/components/account/AccountBreadcrumb";
import EditableProfile from "@/components/EditableProfile";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "My Profile · Print Laser Stitch",
  description: "Update your name, phone, and contact details.",
};

export default async function ProfilePage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account/profile");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <AccountBreadcrumb current="My Profile" />
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {customer.email}
        </p>

        <EditableProfile
          initial={{
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
          }}
        />
      </main>
      <Footer />
    </>
  );
}
