import type { Metadata } from "next";
import { Inter, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-store";
import AmbientBackground from "@/components/AmbientBackground";

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

export const metadata: Metadata = {
  title: "Print Laser Stitch",
  description:
    "Custom stickers, t-shirts, business cards, banners, embroidery, and more. Designed and printed for your brand.",
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
        <AmbientBackground />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
