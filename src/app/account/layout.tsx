"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, Package, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

const SIDEBAR_LINKS = [
  { href: "/account", label: "My Account", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/profile", label: "Profile", icon: Settings },
];

// Pages that don't require authentication
const PUBLIC_PAGES = ["/account/login", "/account/register", "/account/forgot-password"];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/customer/me");
        if (res.ok) {
          setLoggedIn(true);
          // If logged in user tries to access login/register, redirect to account
          if (isPublicPage) {
            router.push("/account");
            return;
          }
        } else {
          setLoggedIn(false);
          // If not logged in and trying to access protected page, redirect to login
          if (!isPublicPage) {
            router.push("/account/login");
            return;
          }
        }
      } catch {
        setLoggedIn(false);
        if (!isPublicPage) {
          router.push("/account/login");
          return;
        }
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicPage, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/customer/logout", { method: "POST" });
      toast.success("You have been logged out");
      router.push("/account/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Public pages render without sidebar
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Protected pages render with sidebar
  if (!loggedIn) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {SIDEBAR_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0",
                    isActive
                      ? "bg-green-50 text-green-700 border-l-2 border-l-green-700"
                      : "text-gray-600 hover:text-green-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
