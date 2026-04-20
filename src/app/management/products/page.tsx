"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductImage } from "@/components/products/ProductImage";
import { BestsellerBadge } from "@/components/products/BestsellerBadge";
import { formatPrice } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Upload, Download, X } from "lucide-react";
import { useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<{ id: number; name: string; slug: string; sku?: string; imageUrl: string | null; productType: string; isActive: boolean; isFeatured: boolean; priceFrom: number; totalStock: number; inStock: boolean; categoryId?: number; category: { id: number; name: string }; variants: { price: number; stock: number; isActive: boolean }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState("");
  const [badgeCfg, setBadgeCfg] = useState<{ label: string; color: string }>({ label: "Bestseller", color: "green" });

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      if (json.data?.user) {
        setCurrentUserId(Number(json.data.user.sub));
        setUserRole(json.data.user.role || "");
      }
    });
    fetch("/api/badge-config").then((r) => r.json()).then((j) => { if (j.data) setBadgeCfg(j.data); }).catch(() => {});
  }, []);

  const fetchProducts = () => {
    fetch("/api/admin/products/list")
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.data || []);
        setLoading(false);
      });
  };

  const [deleteModal, setDeleteModal] = useState<{ id: number; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeactivateModal, setBulkDeactivateModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/products/import", { method: "POST", body: formData });
      const json = await res.json();
      if (json.data) {
        toast.success(`Imported ${json.data.imported} product(s)${json.data.skipped ? `, ${json.data.skipped} skipped` : ""}`);
        if (json.data.errors?.length) {
          json.data.errors.forEach((err: string) => toast.error(err));
        }
        fetchProducts();
      } else {
        toast.error(json.message || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Category", "Type", "Price From", "Stock", "Status", "Featured"];
    const rows = products.map((p) => [
      p.name,
      p.category?.name || "",
      p.productType,
      (p.priceFrom / 100).toFixed(2),
      p.totalStock ?? 0,
      !p.isActive ? "Inactive" : p.inStock ? "In stock" : "Out of stock",
      p.isFeatured ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = `name,description,category,productType,origin,imageUrl,isFeatured,weightGrams,price,cost,stock
"Example Green Tea","A smooth green tea","Green Tea","tea","Japan","","false","100","12.99","6.50","50"
"Example Green Tea","A smooth green tea","Green Tea","tea","Japan","","false","250","28.99","15.00","30"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDeactivate = async () => {
    if (!deleteModal) return;
    const res = await fetch(`/api/admin/products/${deleteModal.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.data) {
      toast.success(`"${deleteModal.name}" deactivated`);
      fetchProducts();
    } else {
      toast.error("Failed to deactivate product");
    }
    setDeleteModal(null);
  };

  const categories = [...new Set(products.map((p) => p.category?.name).filter(Boolean))].sort();

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) return false;
    }
    if (categoryFilter && p.category?.name !== categoryFilter) return false;
    if (typeFilter && p.productType !== typeFilter) return false;
    if (statusFilter === "active" && !p.isActive) return false;
    if (statusFilter === "inactive" && p.isActive) return false;
    if (statusFilter === "in_stock" && (!p.isActive || !p.inStock)) return false;
    if (statusFilter === "out_of_stock" && (!p.isActive || p.inStock)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, categoryFilter, typeFilter, statusFilter]);

  const hasFilters = search || categoryFilter || typeFilter || statusFilter;

  // Bulk selection
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const ids = paginated.map((p: any) => p.id as number);
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      }
    });
  }, [paginated]);

  const handleBulkDeactivate = async () => {
    setBulkProcessing(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.data) successCount++;
      } catch {}
    }
    toast.success(`${successCount} product(s) deactivated`);
    setSelectedIds(new Set());
    setBulkDeactivateModal(false);
    setBulkProcessing(false);
    fetchProducts();
  };

  const handleBulkActivate = async () => {
    setBulkProcessing(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      try {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...product, categoryId: product.category?.id ?? product.categoryId, isActive: true }),
        });
        const json = await res.json();
        if (json.data) successCount++;
      } catch { /* skip */ }
    }
    toast.success(`${successCount} product(s) activated`);
    setSelectedIds(new Set());
    setBulkProcessing(false);
    fetchProducts();
  };

  const visibleIds = paginated.map((p: any) => p.id as number);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} loading={importing}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Link href="/management/products/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={downloadTemplate} className="text-xs text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 underline">
          Download CSV template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="rounded-lg border border-gray-300 dark:border-gray-600 pl-9 pr-3 py-2 text-sm w-full sm:w-56 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100">
          <option value="">All types</option>
          <option value="tea">Tea</option>
          <option value="coffee">Coffee</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setCategoryFilter(""); setTypeFilter(""); setStatusFilter(""); }} className="text-sm text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">{hasFilters ? "No products match your filters." : "No products yet."}</div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-green-700 focus:ring-green-500 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Price from</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Stock</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p: any) => (
                  <tr key={p.id} className={`border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!p.isActive ? "opacity-40" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-green-700 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.name}
                          productType={p.productType}
                          size="sm"
                          className="rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            {p.isFeatured && <BestsellerBadge label={badgeCfg.label} color={badgeCfg.color} />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category?.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.productType === "tea" ? "success" : "warning"}>
                        {p.productType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(p.priceFrom)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {p.totalStock ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!p.isActive ? (
                        <Badge variant="default">Inactive</Badge>
                      ) : p.inStock ? (
                        <Badge variant="success">In stock</Badge>
                      ) : (
                        <Badge variant="error">Out of stock</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/management/products/${p.id}/edit`} aria-label={`Edit ${p.name}`}>
                          <Button variant="ghost" size="sm" aria-label={`Edit ${p.name}`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ id: p.id, name: p.name })} aria-label={`Delete ${p.name}`}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3 p-3">
            {paginated.map((p: any) => (
              <div key={p.id} className={`border border-gray-200 dark:border-gray-700 rounded-lg p-3 ${!p.isActive ? "opacity-40" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-green-700 focus:ring-green-500 cursor-pointer mt-1"
                  />
                  <ProductImage
                    src={p.imageUrl}
                    alt={p.name}
                    productType={p.productType}
                    size="sm"
                    className="rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                    {p.isFeatured && <BestsellerBadge label={badgeCfg.label} color={badgeCfg.color} />}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.category?.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                  <Badge variant={p.productType === "tea" ? "success" : "warning"}>{p.productType}</Badge>
                  <span className="font-medium">{formatPrice(p.priceFrom)}</span>
                  <span className="text-gray-500 dark:text-gray-400">Stock: {p.totalStock ?? "—"}</span>
                  {!p.isActive ? (
                    <Badge variant="default">Inactive</Badge>
                  ) : p.inStock ? (
                    <Badge variant="success">In stock</Badge>
                  ) : (
                    <Badge variant="error">Out of stock</Badge>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                  <Link href={`/management/products/${p.id}/edit`}>
                    <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ id: p.id, name: p.name })}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} product{filtered.length !== 1 ? "s" : ""} total</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-100"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-sm rounded-lg border ${p === page ? "bg-green-700 text-white border-green-700" : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-100"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Deactivate confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Deactivate Product</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to deactivate <strong>{deleteModal.name}</strong>? It will be hidden from the store but can be reactivated later.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeactivate}>
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk deactivate confirmation modal */}
      {bulkDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setBulkDeactivateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Deactivate {selectedIds.size} Products</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to deactivate <strong>{selectedIds.size}</strong> selected product{selectedIds.size !== 1 ? "s" : ""}? They will be hidden from the store but can be reactivated later.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setBulkDeactivateModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleBulkDeactivate} loading={bulkProcessing}>
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-gray-600" />
          <Button size="sm" variant="destructive" onClick={() => setBulkDeactivateModal(true)}>
            Deactivate Selected
          </Button>
          <Button size="sm" variant="secondary" onClick={handleBulkActivate} loading={bulkProcessing}>
            Activate Selected
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 dark:text-gray-500 hover:text-white ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
