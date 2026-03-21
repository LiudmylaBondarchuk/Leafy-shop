"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductImage } from "@/components/products/ProductImage";
import { BestsellerBadge } from "@/components/products/BestsellerBadge";
import { formatPrice } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    fetch("/api/admin/products/list")
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.data || []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDeactivate = async (id: number, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will be hidden from the store.`)) return;

    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.data) {
      toast.success(`"${name}" deactivated`);
      fetchProducts();
    } else {
      toast.error("Failed to deactivate product");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Price from</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
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
                        <Link href={`/admin/products/${p.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(p.id, p.name)}>
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
    </div>
  );
}
