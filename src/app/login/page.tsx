import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthForm from "@/components/AuthForm";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Log in · Print Laser Stitch",
  description: "Log in to your Print Laser Stitch account.",
};

export default async function LoginPage() {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/account");

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="mx-auto max-w-md rounded-3xl border border-border-soft bg-surface p-8">
              Loading…
            </div>
          }
        >
          <AuthForm mode="login" />
        </Suspense>
      </main>
        {/* hidden admin entry — intentionally low visibility */}
        <div className="pb-2 text-right">
          <Link
            href="/admin/login"
            className="font-headline text-[10px] text-foreground/10 transition hover:text-foreground/20"
            tabIndex={-1}
          >
            ·
          </Link>
        </div>
      <Footer />
    </>
  );
}
