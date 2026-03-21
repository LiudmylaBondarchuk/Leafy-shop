"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, SlidersHorizontal, ChevronUp } from "lucide-react";

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
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const activeFilterCount = (activeCategory ? 1 : 0) + (activeType ? 1 : 0) + (inStockOnly ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-green-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </span>
        <ChevronUp className={`h-4 w-4 transition-transform ${mobileOpen ? "" : "rotate-180"}`} />
      </button>

      <div className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
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
    </div>
  );
}
