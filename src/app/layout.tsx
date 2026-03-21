import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

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
      <body className="min-h-screen bg-[#FFFBF0] text-gray-900 antialiased flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
