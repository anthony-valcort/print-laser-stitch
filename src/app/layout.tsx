import type { Metadata } from "next";
import { Inter, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-store";
import AmbientBackground from "@/components/AmbientBackground";
import ScrollReveal from "@/components/ScrollReveal";
import MobileQuoteBar from "@/components/MobileQuoteBar";
import CartDrawer from "@/components/CartDrawer";
import CookieNotice from "@/components/CookieNotice";
import JsonLd from "@/components/JsonLd";
import { localBusinessJsonLd, websiteJsonLd } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://www.printlaserstitch.com";
const SITE_TITLE = "Custom Printing & Embroidery in Stuart, FL | Print Laser Stitch";
const SITE_DESCRIPTION =
  "Stuart, FL print shop for custom embroidered polos, t-shirts, stickers, banners, signs and laser engraving. Instant online pricing and bulk discounts.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Print Laser Stitch",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Print Laser Stitch",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} ${rajdhani.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground isolate"
        suppressHydrationWarning
      >
        <JsonLd data={[localBusinessJsonLd(), websiteJsonLd()]} />
        <AmbientBackground />
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
        <ScrollReveal />
        <MobileQuoteBar />
        <CookieNotice />
      </body>
    </html>
  );
}
