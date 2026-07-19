import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    // Explicit host allowlist — never "**", which turns /_next/image into an
    // open proxy / SSRF vector. Hosts verified against product & category
    // image_url in the production DB (2026-07-19).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" }, // admin uploads
      { protocol: "https", hostname: "s-trojmiasto.pl" }, // one existing product image
    ],
  },
};

export default nextConfig;
