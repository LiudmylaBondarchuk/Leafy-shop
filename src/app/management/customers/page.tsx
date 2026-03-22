"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { AlertTriangle, Search } from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/admin/customers?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setCustomers(json.data || []);
        setLoading(false);
      });
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <span className="text-sm text-gray-500">{customers.length} customer{customers.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Orders</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Total Spent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Last Order</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/management/customers/${c.id}`} className="font-medium text-gray-900 hover:text-green-700">
                          {c.firstName} {c.lastName}
                        </Link>
                        {c.hasAccount && <Badge variant="success">Account</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-right font-medium">{c.orderCount}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.lastOrderDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.similarCustomers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600" title="Similar customers detected">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {c.similarCustomers.length}
                        </span>
                      )}
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
