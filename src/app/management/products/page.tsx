"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductImage } from "@/components/products/ProductImage";
import { BestsellerBadge } from "@/components/products/BestsellerBadge";
import { formatPrice } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Upload, Download } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProducts = () => {
    fetch("/api/admin/products/list")
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.data || []);
        setLoading(false);
      });
  };

  const [deleteModal, setDeleteModal] = useState<{ id: number; name: string } | null>(null);
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

  const hasFilters = search || categoryFilter || typeFilter || statusFilter;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
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
        <button onClick={downloadTemplate} className="text-xs text-green-700 hover:text-green-800 underline">
          Download CSV template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm w-full sm:w-56"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="tea">Tea</option>
          <option value="coffee">Coffee</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setCategoryFilter(""); setTypeFilter(""); setStatusFilter(""); }} className="text-sm text-green-700 hover:text-green-800">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{hasFilters ? "No products match your filters." : "No products yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Price from</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!p.isActive ? "opacity-40" : ""}`}>
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
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            {p.isFeatured && <BestsellerBadge />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category?.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.productType === "tea" ? "success" : "warning"}>
                        {p.productType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(p.priceFrom)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
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
                        <Link href={`/management/products/${p.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ id: p.id, name: p.name })}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Deactivate confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Deactivate Product</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
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
    </div>
  );
}
