import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductSort } from "@/components/products/ProductSort";
import { Suspense } from "react";

async function getCategories() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/categories`, { cache: "no-store" });
  const json = await res.json();
  return json.data;
}

async function getProducts(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products?${params}`, { cache: "no-store" });
  const json = await res.json();
  return json.data;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const [categories, data] = await Promise.all([
    getCategories(),
    getProducts(params),
  ]);

  const { products: productList, pagination } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Products</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <Suspense>
            <ProductFilters categories={categories} />
          </Suspense>
        </aside>

        {/* Products */}
        <div className="flex-1">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {pagination.total} product{pagination.total !== 1 ? "s" : ""} found
            </p>
            <Suspense>
              <ProductSort />
            </Suspense>
          </div>

          {/* Grid */}
          {productList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {productList.map((product: any) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4">No products match your criteria.</p>
              <a href="/products" className="text-green-700 hover:text-green-800 text-sm font-medium">
                Clear filters
              </a>
            </div>
          )}

          {/* Pagination info */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 text-center text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
