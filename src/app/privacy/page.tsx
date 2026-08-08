import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy · Print Laser Stitch",
  description:
    "How Print Laser Stitch collects, uses, and protects your information on our website and mobile app.",
};

const PROSE =
  "max-w-none text-[15px] leading-7 text-foreground/85 " +
  "[&_p]:my-4 " +
  "[&_a]:font-medium [&_a]:text-[#18d3e8] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#d9f000] " +
  "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-foreground " +
  "[&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 " +
  "[&_li]:marker:text-[#d9f000]";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <header>
            <span className="font-headline text-[11px] uppercase tracking-[0.2em] text-[#d9f000]">
              Effective August 8, 2026
            </span>
            <h1 className="mt-4 font-display text-3xl font-black uppercase leading-[1.1] tracking-tight sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-base text-foreground-muted">
              This policy explains what information Print Laser Stitch
              collects through our website and mobile app, how we use it, and
              who we share it with.
            </p>
          </header>

          <div className={`mt-8 ${PROSE}`}>
            <h2>Who we are</h2>
            <p>
              Print Laser Stitch is a family-owned print shop in Stuart,
              Florida. This policy covers printlaserstitch.com and the Print
              Laser Stitch mobile app (iOS and Android).
            </p>

            <h2>Information we collect</h2>
            <ul>
              <li>
                <strong>Account information</strong> — name, email address,
                and password when you create an account or sign in.
              </li>
              <li>
                <strong>Order information</strong> — email, phone number, and
                shipping/billing details you provide when getting a quote or
                checking out. Payments are processed by Shopify; we don&apos;t
                store your card details ourselves.
              </li>
              <li>
                <strong>Uploaded content</strong> — artwork, photos, and
                design files you upload for printing, engraving, or
                embroidery.
              </li>
              <li>
                <strong>Communications</strong> — messages you send us for
                support, quotes, or order questions.
              </li>
              <li>
                <strong>Camera and photo library (mobile app)</strong> — we
                request access only so you can take or select a photo to
                upload for a print order. We never access your camera or
                photos without you actively choosing to do so.
              </li>
            </ul>

            <h2>How we use your information</h2>
            <p>
              We use your information to fulfill and ship orders, generate
              quotes, manage your account and order history, and respond to
              support requests. We do not sell your personal information, and
              we do not use it for third-party advertising.
            </p>

            <h2>Who we share it with</h2>
            <ul>
              <li>
                <strong>Shopify</strong> — our e-commerce platform, used to
                process orders, checkout, and payments.
              </li>
              <li>
                <strong>Cloudinary</strong> — used to securely host artwork
                and reference photos you upload for printing.
              </li>
            </ul>
            <p>
              We don&apos;t share your information with advertisers or data
              brokers.
            </p>

            <h2>Cookies</h2>
            <p>
              Our website uses a functional, secure cookie to keep you signed
              in and to remember your cart. We don&apos;t use third-party
              advertising or tracking cookies.
            </p>

            <h2>Data retention</h2>
            <p>
              We keep order and account information for as long as needed to
              fulfill orders, meet tax and accounting requirements, and
              support your account.
            </p>

            <h2>Your rights</h2>
            <p>
              You can contact us at any time to access, update, or delete
              your personal information — see the contact details below.
            </p>

            <h2>Children&apos;s privacy</h2>
            <p>
              Our website and app are not directed to children under 13, and
              we do not knowingly collect information from them.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The date at the
              top of this page reflects the most recent revision.
            </p>

            <h2>Contact us</h2>
            <p>
              Print Laser Stitch
              <br />
              3141 SE Dominica Terrace, Stuart, FL 34997
              <br />
              (772) 985-2854
              <br />
              info@printlaserstitch.com
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
