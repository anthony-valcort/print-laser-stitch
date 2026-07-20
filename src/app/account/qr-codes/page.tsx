import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountBreadcrumb from "@/components/account/AccountBreadcrumb";
import QrCodeListClient from "@/components/qr/QrCodeListClient";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Manage QR Code · Print Laser Stitch",
  description:
    "Create and manage QR codes for phone, email, wifi, contact cards, and more.",
};

export default async function QrCodesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account/qr-codes");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <AccountBreadcrumb current="Manage QR Code" />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Manage QR Code</h1>
          <Link
            href="/account/qr-codes/new"
            className="rounded-md accent-gradient px-4 py-2.5 font-headline text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#d9f000]/30 hover:brightness-110"
          >
            + Add New QR Code
          </Link>
        </div>
        <QrCodeListClient />
      </main>
      <Footer />
    </>
  );
}
