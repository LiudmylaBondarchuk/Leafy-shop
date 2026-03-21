"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { Package, ShoppingBag, DollarSign, Clock, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

type DateRange = "today" | "week" | "month" | "all" | "custom";

function getDateFilter(range: DateRange): string | null {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case "week":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString();
    case "month":
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString();
    case "all":
    case "custom":
      return null;
  }
}

export default function AdminDashboardPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders?limit=1000").then((r) => r.json()),
      fetch("/api/products?limit=100").then((r) => r.json()),
    ]).then(([ordersJson, productsJson]) => {
      const orders = ordersJson.data?.orders || [];
      const products = productsJson.data?.products || [];
      setAllOrders(Array.isArray(orders) ? orders : []);
      setTotalProducts(products.length);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-400 py-8">Loading dashboard...</div>;

  // Filter orders by date range
  let filteredOrders = allOrders;
  if (dateRange === "custom") {
    if (customFrom) filteredOrders = filteredOrders.filter((o) => o.createdAt >= new Date(customFrom).toISOString());
    if (customTo) filteredOrders = filteredOrders.filter((o) => o.createdAt <= new Date(customTo + "T23:59:59").toISOString());
  } else {
    const dateFilter = getDateFilter(dateRange);
    if (dateFilter) filteredOrders = filteredOrders.filter((o) => o.createdAt >= dateFilter);
  }

  // Stats
  const totalRevenue = filteredOrders
    .filter((o) => !["cancelled", "returned"].includes(o.status))
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = filteredOrders.filter((o) => o.status === "new").length;
  const processingOrders = filteredOrders.filter((o) => o.status === "processing").length;
  const shippedOrders = filteredOrders.filter((o) => o.status === "shipped").length;

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const status of ORDER_STATUSES) {
    statusCounts[status] = filteredOrders.filter((o) => o.status === status).length;
  }

  const dateRangeLabels: Record<DateRange, string> = {
    today: "Today",
    week: "7 days",
    month: "30 days",
    all: "All time",
    custom: "Custom",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["today", "week", "month", "all", "custom"] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {dateRangeLabels[range]}
              </button>
            ))}
          </div>
          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-xs" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-xs" />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg text-blue-600 bg-blue-100">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Orders</p>
              <p className="text-xl font-bold text-gray-900">{filteredOrders.length}</p>
            </div>
          </div>
        </Card>

        <Link href="/admin/orders?status=new">
          <Card className="p-5 hover:border-yellow-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg text-yellow-600 bg-yellow-100">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-900">{pendingOrders}</p>
                {pendingOrders > 0 && <p className="text-xs text-yellow-600">Needs attention →</p>}
              </div>
            </div>
          </Card>
        </Link>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg text-green-600 bg-green-100">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
        </Card>

        <Link href="/admin/products">
          <Card className="p-5 hover:border-purple-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg text-purple-600 bg-purple-100">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Products</p>
                <p className="text-xl font-bold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Status breakdown + Attention needed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status breakdown */}
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-2">
            {ORDER_STATUSES.map((status) => {
              const count = statusCounts[status] || 0;
              if (count === 0 && ["returned"].includes(status)) return null;
              return (
                <Link
                  key={status}
                  href={`/admin/orders?status=${status}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={ORDER_STATUS_COLORS[status as OrderStatus]}>
                      {ORDER_STATUS_LABELS[status as OrderStatus]}
                    </Badge>
                  </div>
                  <span className={`text-sm font-medium ${count > 0 ? "text-gray-900" : "text-gray-300"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Needs attention */}
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Needs Attention</h2>
          <div className="space-y-3">
            {pendingOrders > 0 && (
              <Link href="/admin/orders?status=new" className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">{pendingOrders} new order{pendingOrders > 1 ? "s" : ""} waiting</p>
                  <p className="text-xs text-yellow-600">Click to review →</p>
                </div>
              </Link>
            )}
            {processingOrders > 0 && (
              <Link href="/admin/orders?status=processing" className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">{processingOrders} order{processingOrders > 1 ? "s" : ""} being prepared</p>
                  <p className="text-xs text-blue-600">Click to view →</p>
                </div>
              </Link>
            )}
            {shippedOrders > 0 && (
              <Link href="/admin/orders?status=shipped" className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-800">{shippedOrders} order{shippedOrders > 1 ? "s" : ""} in transit</p>
                  <p className="text-xs text-purple-600">Click to view →</p>
                </div>
              </Link>
            )}
            {pendingOrders === 0 && processingOrders === 0 && shippedOrders === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">All caught up! No orders need attention.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-green-700 hover:text-green-800">
            View all →
          </Link>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Order</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Payment</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-2 font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 10).map((order: any) => (
                  <tr key={order.id || order.orderNumber} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-green-700 hover:text-green-800">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {order.customerFirstName} {order.customerLastName}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-gray-500">{order.paymentMethod === "cod" ? "COD" : "PayPal"}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/orders?status=${order.status}`}>
                        <Badge className={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                        </Badge>
                      </Link>
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
