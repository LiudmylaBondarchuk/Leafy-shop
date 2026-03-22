import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductSort } from "@/components/products/ProductSort";
import { Suspense } from "react";
import { headers } from "next/headers";
import { getSettings } from "@/lib/settings";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function getCategories() {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/categories`, { cache: "no-store" });
  const json = await res.json();
  return json.data;
}

async function getProducts(searchParams: Record<string, string>) {
  const baseUrl = await getBaseUrl();
  const params = new URLSearchParams(searchParams);
  const res = await fetch(`${baseUrl}/api/products?${params}`, { cache: "no-store" });
  const json = await res.json();
  return json.data;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const [categoriesList, data, cfg] = await Promise.all([getCategories(), getProducts(params), getSettings()]);
  const { products: productList, pagination } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Products</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 shrink-0">
          <Suspense>
            <ProductFilters categories={categoriesList} />
          </Suspense>
        </aside>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {pagination.total} product{pagination.total !== 1 ? "s" : ""} found
            </p>
            <Suspense>
              <ProductSort />
            </Suspense>
          </div>
          {productList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {productList.map((product: any) => (
                <ProductCard key={product.id} {...product} badgeLabel={cfg["badge.featured.label"]} badgeColor={cfg["badge.featured.color"]} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4">No products match your criteria.</p>
              <a href="/products" className="text-green-700 hover:text-green-800 text-sm font-medium">Clear filters</a>
            </div>
          )}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              {pagination.page > 1 && (
                <a
                  href={`/products?${new URLSearchParams({ ...params, page: String(pagination.page - 1) }).toString()}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  ← Previous
                </a>
              )}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/products?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                  className={`px-3 py-1.5 text-sm rounded-lg ${p === pagination.page ? "bg-green-700 text-white" : "border border-gray-300 hover:bg-gray-100 text-gray-700"}`}
                >
                  {p}
                </a>
              ))}
              {pagination.page < pagination.totalPages && (
                <a
                  href={`/products?${new URLSearchParams({ ...params, page: String(pagination.page + 1) }).toString()}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  Next →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
