"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { AlertTriangle, Search, Pencil, X } from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ accountId: number; firstName: string; lastName: string; phone: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const fetchCustomers = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/admin/customers?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setCustomers(json.data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const filtered = customers.filter((c) => {
    if (accountFilter === "with" && !c.hasAccount) return false;
    if (accountFilter === "without" && c.hasAccount) return false;
    return true;
  });

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/admin/customers/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editModal),
      });
      const json = await res.json();
      if (json.data) {
        toast.success("Customer account updated");
        setEditModal(null);
        fetchCustomers();
      } else {
        toast.error(json.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update customer account");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <span className="text-sm text-gray-500">{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All customers</option>
          <option value="with">With account</option>
          <option value="without">Without account</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
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
                {filtered.map((c: any) => (
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
                      {formatDateShort(c.lastOrderDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.hasAccount && (
                          <button
                            onClick={() => setEditModal({ accountId: c.accountId, firstName: c.firstName, lastName: c.lastName, phone: c.phone })}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit account"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {c.similarCustomers.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-600" title="Similar customers detected">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {c.similarCustomers.length}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit account modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!editSaving) setEditModal(null); }}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Edit Customer Account</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Input label="First name" id="editFirstName" value={editModal.firstName} onChange={(e) => setEditModal({ ...editModal, firstName: e.target.value })} />
              <Input label="Last name" id="editLastName" value={editModal.lastName} onChange={(e) => setEditModal({ ...editModal, lastName: e.target.value })} />
              <Input label="Phone" id="editPhone" value={editModal.phone} onChange={(e) => setEditModal({ ...editModal, phone: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditModal(null)} disabled={editSaving}>Cancel</Button>
              <Button size="sm" className="flex-1" loading={editSaving} onClick={handleEditSave}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
