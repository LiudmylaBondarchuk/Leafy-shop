"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Leaf, LayoutDashboard, Package, ShoppingBag, Tag, BarChart3, Users, UserCog, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/discounts", label: "Discounts", icon: Tag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: UserCog },
];

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  if (parts[0] === "admin") {
    crumbs.push({ label: "Dashboard", href: "/admin" });

    if (parts[1]) {
      const labels: Record<string, string> = {
        products: "Products",
        orders: "Orders",
        discounts: "Discounts",
        customers: "Customers",
        analytics: "Analytics",
        users: "Users",
      };
      crumbs.push({ label: labels[parts[1]] || parts[1], href: `/admin/${parts[1]}` });

      if (parts[2] === "new") {
        crumbs.push({ label: "New", href: pathname });
      } else if (parts[2] && parts[3] === "edit") {
        crumbs.push({ label: "Edit", href: pathname });
      } else if (parts[2] && !parts[3]) {
        crumbs.push({ label: `#${parts[2]}`, href: pathname });
      }
    }
  }

  return crumbs;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.user) {
          setAdminName(json.data.user.name);
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => router.push("/admin/login"))
      .finally(() => setChecking(false));
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-green-900 text-white transform transition-transform lg:translate-x-0 lg:static lg:inset-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-green-800">
            <Link href="/admin" className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-green-400" />
              <span className="text-lg font-bold">Leafy Admin</span>
            </Link>
            <button className="lg:hidden text-green-300" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-green-800 text-white"
                      : "text-green-200 hover:bg-green-800/50 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-green-800">
            <div className="px-3 py-2 text-sm text-green-300 mb-1">{adminName}</div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-200 hover:bg-green-800/50 hover:text-white w-full transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with breadcrumbs + avatar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <nav className="flex-1 flex items-center gap-1 text-sm text-gray-500 overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1 whitespace-nowrap">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-green-700 transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500 hidden sm:block">{adminName}</span>
            <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-medium">
              {adminName ? adminName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "A"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
