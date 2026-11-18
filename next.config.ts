import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The two old calculators were merged into the Sign & Decal Builder.
  async redirects() {
    return [
      { source: "/signage-quotes", destination: "/decal-quote", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
