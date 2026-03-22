"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import { DollarSign, TrendingUp, ShoppingBag, Users, Package, Percent, Truck, Tag } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type DateRange = "today" | "week" | "month" | "all" | "custom";

const COLORS = ["#15803d", "#2563eb", "#9333ea", "#ea580c", "#dc2626", "#0891b2", "#65a30d"];
const PIE_COLORS = ["#15803d", "#2563eb", "#9333ea", "#ea580c", "#dc2626", "#65a30d"];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fetchData = () => {
    setLoading(true);
    let url = "/api/admin/analytics";
    const params = new URLSearchParams();

    if (dateRange === "custom") {
      if (customFrom) params.set("from", new Date(customFrom).toISOString());
      if (customTo) params.set("to", customTo);
    } else if (dateRange !== "all") {
      const now = new Date();
      let fromDate: Date;
      switch (dateRange) {
        case "today": fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case "week": fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case "month": fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        default: fromDate = new Date(0);
      }
      params.set("from", fromDate.toISOString());
    }

    fetch(`${url}?${params}`).then((r) => r.json()).then((json) => {
      setData(json.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [dateRange, customFrom, customTo]);

  const dateRangeLabels: Record<DateRange, string> = {
    today: "Today", week: "7 days", month: "30 days", all: "All time", custom: "Custom",
  };

  if (loading || !data) return <div className="text-gray-400 py-8">Loading analytics...</div>;

  const { summary, charts } = data;

  const safeMarginPercent = summary.totalRevenue > 0
    ? Math.round((summary.totalMargin / summary.totalRevenue) * 100)
    : 0;

  const formatTooltipValue = (value: number) => formatPrice(value);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto max-w-full">
            {(["today", "week", "month", "all", "custom"] as DateRange[]).map((range) => (
              <button key={range} onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${dateRange === range ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {dateRangeLabels[range]}
              </button>
            ))}
          </div>
          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs" />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0"><DollarSign className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{formatPrice(summary.totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 shrink-0"><Package className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Cost</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{formatPrice(summary.totalCost)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shrink-0"><TrendingUp className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Margin</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{formatPrice(summary.totalMargin)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 shrink-0"><Percent className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Margin %</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{safeMarginPercent}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"><ShoppingBag className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Orders</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.activeOrders}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">avg {formatPrice(summary.avgOrderValue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400"><Users className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.uniqueCustomers}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{summary.returningCustomers} returning</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><Truck className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Shipping</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrice(summary.totalShipping)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400"><Tag className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Discounts Given</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrice(summary.totalDiscount)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      {charts.revenueChart.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
              <Tooltip formatter={(v: any) => formatPrice(Number(v))} labelFormatter={(d: any) => new Date(d).toLocaleDateString("en-US", { dateStyle: "medium" })} />
              <Line type="monotone" dataKey="revenue" stroke="#15803d" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Orders Chart */}
      {charts.revenueChart.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Orders Per Day</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { dateStyle: "medium" })} />
              <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Status breakdown */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">By Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={charts.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {charts.statusBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {charts.statusBreakdown.map((s: any, i: number) => (
              <div key={s.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {s.name}
                </span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment methods */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={charts.paymentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {charts.paymentBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {charts.paymentBreakdown.map((s: any, i: number) => (
              <div key={s.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {s.name}
                </span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Shipping methods */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Shipping Methods</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={charts.shippingBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {charts.shippingBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {charts.shippingBreakdown.map((s: any, i: number) => (
              <div key={s.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {s.name}
                </span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Category breakdown */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Tea vs Coffee</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={charts.categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {charts.categoryBreakdown.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#15803d" : "#92400e"} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {charts.categoryBreakdown.map((s: any, i: number) => (
              <div key={s.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? "#15803d" : "#92400e" }} />
                  {s.name}
                </span>
                <span className="font-medium">{s.value} items</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Top Products by Quantity</h3>
          {charts.topProductsByQty.length === 0 ? (
            <p className="text-sm text-gray-400">No sales data</p>
          ) : (
            <div className="space-y-3">
              {charts.topProductsByQty.map((p: any, i: number) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{p.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{p.quantity} sold</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Top Products by Revenue</h3>
          {charts.topProductsByRevenue.length === 0 ? (
            <p className="text-sm text-gray-400">No sales data</p>
          ) : (
            <div className="space-y-3">
              {charts.topProductsByRevenue.map((p: any, i: number) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{p.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{formatPrice(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
