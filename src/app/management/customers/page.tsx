"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { AlertTriangle, Search, Pencil, X, KeyRound } from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { COUNTRIES } from "@/constants/countries";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ accountId: number; email: string; firstName: string; lastName: string; phone: string; shippingStreet: string; shippingCity: string; shippingZip: string; shippingCountry: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

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
                      {c.orderCount > 0 ? formatDateShort(c.lastOrderDate) : (
                        <span className="italic">No orders yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.hasAccount && (
                          <button
                            onClick={async () => {
                              // Load full customer data including address
                              try {
                                const res = await fetch(`/api/admin/customers/account?id=${c.accountId}`);
                                const json = await res.json();
                                const d = json.data;
                                setEditModal({
                                  accountId: c.accountId,
                                  email: d?.email || c.email,
                                  firstName: d?.firstName || c.firstName,
                                  lastName: d?.lastName || c.lastName,
                                  phone: d?.phone || c.phone || "",
                                  shippingStreet: d?.shippingStreet || "",
                                  shippingCity: d?.shippingCity || "",
                                  shippingZip: d?.shippingZip || "",
                                  shippingCountry: d?.shippingCountry || "PL",
                                });
                              } catch {
                                setEditModal({ accountId: c.accountId, email: c.email, firstName: c.firstName, lastName: c.lastName, phone: c.phone || "", shippingStreet: "", shippingCity: "", shippingZip: "", shippingCountry: "PL" });
                              }
                            }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8" onClick={() => { if (!editSaving) setEditModal(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Edit Customer Account</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Email" id="editEmail" type="email" value={editModal.email} onChange={(e) => setEditModal({ ...editModal, email: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" id="editFirstName" value={editModal.firstName} onChange={(e) => setEditModal({ ...editModal, firstName: e.target.value })} />
                <Input label="Last name" id="editLastName" value={editModal.lastName} onChange={(e) => setEditModal({ ...editModal, lastName: e.target.value })} />
              </div>
              <Input label="Phone" id="editPhone" value={editModal.phone} onChange={(e) => setEditModal({ ...editModal, phone: e.target.value })} />
              <hr className="border-gray-200 dark:border-gray-700" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Shipping Address</p>
              <Input label="Street & number" id="editStreet" value={editModal.shippingStreet} onChange={(e) => setEditModal({ ...editModal, shippingStreet: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" id="editCity" value={editModal.shippingCity} onChange={(e) => setEditModal({ ...editModal, shippingCity: e.target.value })} />
                <Input label="Zip code" id="editZip" value={editModal.shippingZip} onChange={(e) => setEditModal({ ...editModal, shippingZip: e.target.value })} />
              </div>
              <div>
                <label htmlFor="editCountry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <select id="editCountry" value={editModal.shippingCountry} onChange={(e) => setEditModal({ ...editModal, shippingCountry: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  {COUNTRIES.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditModal(null)} disabled={editSaving}>Cancel</Button>
              <Button size="sm" className="flex-1" loading={editSaving} onClick={handleEditSave}>Save Changes</Button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                loading={sendingReset}
                onClick={async () => {
                  setSendingReset(true);
                  try {
                    const res = await fetch("/api/admin/customers/account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ accountId: editModal.accountId }),
                    });
                    const json = await res.json();
                    if (json.data) {
                      toast.success(json.data.message || "Password reset link sent");
                    } else {
                      toast.error(json.message || "Failed to send reset link");
                    }
                  } catch {
                    toast.error("Failed to send reset link");
                  } finally {
                    setSendingReset(false);
                  }
                }}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Send Password Reset Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
