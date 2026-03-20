"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { Package, ShoppingBag, DollarSign, Clock } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalProducts: number;
  recentOrders: any[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    // Fetch dashboard data from multiple endpoints
    Promise.all([
      fetch("/api/orders?limit=100").then((r) => r.json()),
      fetch("/api/products?limit=100").then((r) => r.json()),
    ]).then(([ordersJson, productsJson]) => {
      const orders = ordersJson.data?.orders || ordersJson.data || [];
      const products = productsJson.data?.products || [];
      const orderList = Array.isArray(orders) ? orders : [];

      setData({
        totalOrders: orderList.length,
        totalRevenue: orderList.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
        pendingOrders: orderList.filter((o: any) => o.status === "new").length,
        totalProducts: products.length,
        recentOrders: orderList.slice(0, 5),
      });
    });
  }, []);

  if (!data) return <div className="text-gray-400">Loading dashboard...</div>;

  const statCards = [
    { label: "Total Orders", value: data.totalOrders, icon: ShoppingBag, color: "text-blue-600 bg-blue-100" },
    { label: "Revenue", value: formatPrice(data.totalRevenue), icon: DollarSign, color: "text-green-600 bg-green-100" },
    { label: "Pending", value: data.pendingOrders, icon: Clock, color: "text-yellow-600 bg-yellow-100" },
    { label: "Products", value: data.totalProducts, icon: Package, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-green-700 hover:text-green-800">
            View all →
          </Link>
        </div>

        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Order</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-2 font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order: any) => (
                  <tr key={order.id || order.orderNumber} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-green-700 hover:text-green-800">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {order.customerFirstName} {order.customerLastName}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
