import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountBreadcrumb from "@/components/account/AccountBreadcrumb";
import QrCodeForm from "@/components/qr/QrCodeForm";
import { getCurrentCustomer } from "@/lib/customer-session";
import { getCustomerQrCodes } from "@/lib/qr-codes";

export const metadata: Metadata = {
  title: "Edit QR Code · Print Laser Stitch",
};

type Params = Promise<{ id: string }>;

export default async function EditQrCodePage({
  params,
}: {
  params: Params;
}) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?redirect=/account/qr-codes");

  const { id } = await params;
  const codes = await getCustomerQrCodes(customer.id);
  const entry = codes.find((c) => c.id === id);
  if (!entry) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <AccountBreadcrumb current="Edit QR Code" />
        <h1 className="text-3xl font-bold tracking-tight">Edit QR Code</h1>
        <div className="mt-6">
          <QrCodeForm
            mode="edit"
            qrId={entry.id}
            initial={{
              type: entry.type,
              title: entry.title,
              fields: entry.fields,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
