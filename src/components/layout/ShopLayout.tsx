"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";

export function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/management");

  useEffect(() => {
    const beforeCount = useCartStore.getState().items.length;
    useCartStore.getState().checkExpiry();
    const afterCount = useCartStore.getState().items.length;
    if (beforeCount > 0 && afterCount === 0) {
      toast("Your cart expired after 30 minutes of inactivity.");
    }
  }, []);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBF0] dark:bg-gray-900">
      <Suspense>
        <Navbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
