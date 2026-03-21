"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { Search, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get("status");
    if (urlStatus) setStatusFilter(urlStatus);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);

    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setOrders(json.data?.orders || []);
        setLoading(false);
      });
  }, [statusFilter, search, mounted]);

  // Client-side date + name filtering
  const filtered = orders.filter((o) => {
    if (dateFrom) {
      const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
      if (orderDate < dateFrom) return false;
    }
    if (dateTo) {
      const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
      if (orderDate > dateTo) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ["Order #", "Date", "First Name", "Last Name", "Email", "Status", "Payment", "Total"];
    const rows = filtered.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString().split("T")[0],
      o.customerFirstName,
      o.customerLastName,
      o.customerEmail,
      ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status,
      o.paymentMethod || "",
      (o.total / 100).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = statusFilter || search || dateFrom || dateTo;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Button size="sm" variant="secondary" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, name, email..."
            className="rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm w-full sm:w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            title="Date from"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            title="Date to"
          />
        </div>
        {hasFilters && (
          <button onClick={() => { setStatusFilter(""); setSearch(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-green-700 hover:text-green-800">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{hasFilters ? "No orders match your filters." : "No orders yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: any) => (
                  <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/management/orders/${order.id}`} className="font-mono text-green-700 hover:text-green-800 font-medium">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div>{order.customerFirstName} {order.customerLastName}</div>
                      <div className="text-gray-400 text-xs">{order.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(order.total)}</td>
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
