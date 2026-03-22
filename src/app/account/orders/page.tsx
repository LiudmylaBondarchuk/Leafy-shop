"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/customer/orders");
        if (res.ok) {
          const json = await res.json();
          setOrders(json.data?.orders || []);
        }
      } catch {
        // handled silently
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Package className="h-6 w-6 text-green-700" />
        My Orders
      </h1>

      {orders.length === 0 ? (
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
          {orders.map((order) => (
            <Link
              key={order.orderNumber}
              href={`/order/status?number=${order.orderNumber}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {order.orderNumber}
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
  );
}
