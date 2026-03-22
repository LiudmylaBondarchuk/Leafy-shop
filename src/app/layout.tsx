import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { CookieConsent } from "@/components/layout/CookieConsent";

export const metadata: Metadata = {
  title: "Leafy — Premium Teas & Coffees",
  description: "Carefully selected teas and coffees from around the world, delivered to your door.",
  openGraph: {
    title: "Leafy — Premium Teas & Coffees",
    description: "Carefully selected teas and coffees from around the world, delivered to your door.",
    url: "https://leafyshop.eu",
    siteName: "Leafy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900 antialiased">
        <ShopLayout>{children}</ShopLayout>
        <Toaster position="top-right" richColors />
        <CookieConsent />
      </body>
    </html>
  );
}
