"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") || "";
  const activeType = searchParams.get("type") || "";
  const inStockOnly = searchParams.get("in_stock") === "true";

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset page on filter change
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    router.push("/products");
  };

  const hasFilters = activeCategory || activeType || inStockOnly;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-green-700 hover:text-green-800 flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Type */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Type</h4>
        <div className="space-y-1.5">
          {[
            { value: "tea", label: "Tea" },
            { value: "coffee", label: "Coffee" },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeType === value}
                onChange={() => updateParams("type", activeType === value ? null : value)}
                className="rounded border-gray-300 text-green-700 focus:ring-green-600"
              />
              <span className="text-sm text-gray-600">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <label key={cat.slug} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeCategory === cat.slug}
                onChange={() => updateParams("category", activeCategory === cat.slug ? null : cat.slug)}
                className="rounded border-gray-300 text-green-700 focus:ring-green-600"
              />
              <span className="text-sm text-gray-600">
                {cat.name} ({cat.productCount})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* In stock */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={() => updateParams("in_stock", inStockOnly ? null : "true")}
            className="rounded border-gray-300 text-green-700 focus:ring-green-600"
          />
          <span className="text-sm text-gray-600">In stock only</span>
        </label>
      </div>
    </div>
  );
}
