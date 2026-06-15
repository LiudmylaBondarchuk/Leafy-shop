"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatOrderNumber } from "@/lib/utils";

interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
}

interface Order {
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
}

const statusBadgeVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "error",
  refunded: "error",
};

export default function AccountDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch("/api/customer/me"),
          fetch("/api/customer/orders?limit=5"),
        ]);

        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          setProfile(profileJson.data?.customer || null);
        }

        if (ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          setRecentOrders(ordersJson.data?.orders || ordersJson.data || []);
        }
      } catch {
        // Errors handled by layout auth check
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Welcome back, {profile?.firstName}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/account/profile"
            className="text-sm text-green-700 font-medium hover:text-green-800 transition-colors"
          >
            Edit profile
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/account/orders"
            className="text-sm text-green-700 font-medium hover:text-green-800 transition-colors"
          >
            View all orders
          </Link>
        </div>
      </Card>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package className="h-5 w-5 text-green-700" />
            Recent Orders
          </h2>
          {recentOrders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-sm text-green-700 font-medium hover:text-green-800 transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No orders yet. Start shopping!</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm text-green-700 font-medium hover:text-green-800 transition-colors"
            >
              Browse products <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        ) : (
          <Card className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <Link
                key={order.orderNumber}
                href={`/account/orders?detail=${order.orderNumber}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatOrderNumber(order.orderNumber)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadgeVariant[order.status] || "default"}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(order.total)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
