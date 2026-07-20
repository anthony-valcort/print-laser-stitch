import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountBreadcrumb from "@/components/account/AccountBreadcrumb";
import QrCodeForm from "@/components/qr/QrCodeForm";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Add New QR Code · Print Laser Stitch",
};

export default async function NewQrCodePage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account/qr-codes/new");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <AccountBreadcrumb current="Add New QR Code" />
        <h1 className="text-3xl font-bold tracking-tight">Add New QR Code</h1>
        <div className="mt-6">
          <QrCodeForm mode="create" />
        </div>
      </main>
      <Footer />
    </>
  );
}
