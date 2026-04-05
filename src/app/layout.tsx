import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { GTMScript } from "@/components/layout/GTMScript";

export const metadata: Metadata = {
  title: "Leafy — Premium Teas & Coffees",
  description: "Carefully selected teas and coffees from around the world, delivered to your door.",
  openGraph: {
    title: "Leafy — Premium Teas & Coffees",
    description: "Carefully selected teas and coffees from around the world, delivered to your door.",
    url: "https://leafyshop.eu",
    siteName: "Leafy",
    type: "website",
    images: [
      {
        url: "https://leafyshop.eu/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Leafy — Premium Teas & Coffees",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen text-gray-900 dark:text-gray-100 dark:bg-gray-900 antialiased">
        <GTMScript />
        <ShopLayout>{children}</ShopLayout>
        <Toaster position="top-right" richColors />
        <CookieConsent />
      </body>
    </html>
  );
}
