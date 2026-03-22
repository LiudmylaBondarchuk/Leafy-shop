"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatPrice, formatDate, formatDateShort } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ id: number; code: string } | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchCodes = () => {
    fetch("/api/discount-codes")
      .then((r) => r.json())
      .then((json) => {
        setCodes(json.data || []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleToggleActive = async (id: number, code: string, activate: boolean) => {
    const res = await fetch(`/api/admin/discounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: activate }),
    });
    const json = await res.json();
    if (json.data) {
      toast.success(`"${code}" ${activate ? "activated" : "deactivated"}`);
      fetchCodes();
    } else {
      toast.error(`Failed to ${activate ? "activate" : "deactivate"}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const res = await fetch(`/api/admin/discounts/${deleteModal.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.data) {
      toast.success(`"${deleteModal.code}" deleted`);
      fetchCodes();
    } else {
      toast.error(json.message || "Failed to delete");
    }
    setDeleteModal(null);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "percentage": return "Percentage";
      case "fixed_amount": return "Fixed Amount";
      case "free_shipping": return "Free Shipping";
      default: return type;
    }
  };

  const getValueLabel = (code: any) => {
    if (code.type === "percentage") return `${code.value / 100}%`;
    if (code.type === "fixed_amount") return formatPrice(code.value);
    return "—";
  };

  const getStatus = (code: any) => {
    if (!code.isActive) return { label: "Inactive", variant: "default" as const, key: "inactive" };
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return { label: "Expired", variant: "warning" as const, key: "expired" };
    if (code.usageLimit && code.usageCount >= code.usageLimit) return { label: "Used up", variant: "warning" as const, key: "used_up" };
    return { label: "Active", variant: "success" as const, key: "active" };
  };

  const filtered = codes.filter((code) => {
    if (search) {
      const q = search.toLowerCase();
      if (!code.code.toLowerCase().includes(q) && !(code.description || "").toLowerCase().includes(q)) return false;
    }
    if (typeFilter && code.type !== typeFilter) return false;
    if (statusFilter) {
      const s = getStatus(code);
      if (s.key !== statusFilter) return false;
    }
    if (dateFrom || dateTo) {
      const filterStart = dateFrom ? new Date(dateFrom) : null;
      const filterEnd = dateTo ? new Date(dateTo) : null;
      const codeStart = code.startsAt ? new Date(code.startsAt) : null;
      const codeEnd = code.expiresAt ? new Date(code.expiresAt) : null;

      // Overlap: code range and filter range intersect
      if (filterEnd && codeStart && codeStart > filterEnd) return false;
      if (filterStart && codeEnd && codeEnd < filterStart) return false;
    }
    return true;
  });

  const hasFilters = search || typeFilter || statusFilter || dateFrom || dateTo;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
        <Link href="/management/discounts/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Discount
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code..."
            className="rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm w-full sm:w-48"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="percentage">Percentage</option>
          <option value="fixed_amount">Fixed Amount</option>
          <option value="free_shipping">Free Shipping</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
          <option value="used_up">Used up</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          title="Valid from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          title="Valid to"
        />
        {hasFilters && (
          <button onClick={() => { setSearch(""); setTypeFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-green-700 hover:text-green-800">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{hasFilters ? "No discount codes match your filters." : "No discount codes yet."}</div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Min Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Usage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Valid</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created by</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((code: any) => {
                  const status = getStatus(code);
                  return (
                    <tr key={code.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!code.isActive ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-gray-900">{code.code}</span>
                        {code.description && <p className="text-xs text-gray-400 mt-0.5">{code.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getTypeLabel(code.type)}</td>
                      <td className="px-4 py-3 font-medium">{getValueLabel(code)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.minOrderValue ? formatPrice(code.minOrderValue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.usageCount}{code.usageLimit ? ` / ${code.usageLimit}` : " / ∞"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {code.startsAt ? formatDateShort(code.startsAt) : "—"}
                        {" – "}
                        {code.expiresAt ? formatDate(code.expiresAt) : "No expiry"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {code.creatorName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/management/discounts/${code.id}/edit`}>
                            <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(code.id, code.code, !code.isActive)}
                          >
                            <span className={`text-xs font-medium ${code.isActive ? "text-orange-500" : "text-green-600"}`}>
                              {code.isActive ? "Deactivate" : "Activate"}
                            </span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ id: code.id, code: code.code })}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3 p-3">
            {filtered.map((code: any) => {
              const status = getStatus(code);
              return (
                <div key={code.id} className={`border border-gray-200 rounded-lg p-3 ${!code.isActive ? "opacity-40" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-gray-900">{code.code}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {code.description && <p className="text-xs text-gray-400 mt-0.5">{code.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
                    <span>{getTypeLabel(code.type)}</span>
                    <span className="font-medium text-gray-900">{getValueLabel(code)}</span>
                  </div>
                  <div className="flex justify-end gap-1 mt-2 border-t border-gray-100 pt-2">
                    <Link href={`/management/discounts/${code.id}/edit`}>
                      <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(code.id, code.code, !code.isActive)}
                    >
                      <span className={`text-xs font-medium ${code.isActive ? "text-orange-500" : "text-green-600"}`}>
                        {code.isActive ? "Deactivate" : "Activate"}
                      </span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ id: code.id, code: code.code })}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </Card>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Delete Discount Code</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete <strong>{deleteModal.code}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
