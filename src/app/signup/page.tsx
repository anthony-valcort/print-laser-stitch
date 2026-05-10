import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthForm from "@/components/AuthForm";
import { getCurrentCustomer } from "@/lib/customer-session";

export const metadata: Metadata = {
  title: "Sign up · Print Laser Stitch",
  description: "Create a Print Laser Stitch account to track orders.",
};

export default async function SignupPage() {
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
          <AuthForm mode="signup" />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
