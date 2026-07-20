import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
import GuestOrderMigrator from "@/components/GuestOrderMigrator";
import GuestOrdersList from "@/components/GuestOrdersList";
import DashboardCard from "@/components/account/DashboardCard";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "My Account · Print Laser Stitch",
  description: "Manage your profile, orders, and QR codes.",
};

export default async function AccountPage() {
  const customer = await getCurrentCustomer();

  // Guest view — no profile/Shopify orders, but they can still see anything
  // saved locally on this device, with a clear migration CTA.
  if (!customer) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              My Account
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              You&apos;re shopping as a guest
            </h1>
            <p className="mt-2 max-w-xl text-sm text-foreground-muted">
              Any orders you placed on this device are shown below.{" "}
              <Link
                href="/login?redirect=/account"
                className="font-semibold text-accent hover:underline"
              >
                Log in
              </Link>{" "}
              or{" "}
              <Link
                href="/signup?redirect=/account"
                className="font-semibold text-accent hover:underline"
              >
                create an account
              </Link>{" "}
              with the same email to keep them in your history forever and
              access them from any device.
            </p>
          </div>

          <GuestOrdersList filterByEmail={null} />
        </main>
        <Footer />
      </>
    );
  }

  const fullName =
    customer.displayName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        {/* Side-effect only: links any guest orders saved locally on this
            device whose email matches the customer's, to their Shopify
            record. Renders nothing. */}
        <GuestOrderMigrator customerEmail={customer.email} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              My Account
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Hi, {fullName}
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {customer.email}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>

          {/* Top action row — My Profile / Change password / Logout */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-border-soft bg-surface text-sm">
              <Link
                href="/account/profile"
                className="flex items-center gap-1.5 px-4 py-2.5 font-medium hover:bg-white/5"
              >
                <UserIcon />
                My Profile
              </Link>
              <span className="h-5 w-px bg-border-soft" />
              <Link
                href="/account/change-password"
                className="flex items-center gap-1.5 px-4 py-2.5 font-medium hover:bg-white/5"
              >
                <KeyIcon />
                Change password
              </Link>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Feature cards — Orders / Manage QR Code */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <DashboardCard
            href="/account/orders"
            icon="📦"
            title="Orders"
            description="Your complete order history with invoice download and order details."
          />
          <DashboardCard
            href="/account/qr-codes"
            icon="🔗"
            title="Manage QR Code"
            description="Create QR codes with different details and use them in your designs."
          />
        </div>

        {/* Recent local activity — drafts not yet appearing in Shopify's
            customer.orders (paid orders only). Filtered to this customer's
            email so a shared device doesn't leak other accounts' orders. */}
        <GuestOrdersList filterByEmail={customer.email} />
      </main>
      <Footer />
    </>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
