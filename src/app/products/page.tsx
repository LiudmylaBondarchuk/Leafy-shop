import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductSort } from "@/components/products/ProductSort";
import { Suspense } from "react";
import { db } from "@/lib/db";

async function getCategories() {
  const { categories, products } = await import("@/lib/db/schema-pg");
  const { eq, count, and } = await import("drizzle-orm");

  const result = await (db as any)
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.isActive, true)))
    .groupBy(categories.id)
    .orderBy(categories.sortOrder);

  return result;
}

async function getProducts(searchParams: Record<string, string>) {
  const { products, productVariants, categories } = await import("@/lib/db/schema-pg");
  const { eq, and, like, or, sql } = await import("drizzle-orm");

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const limit = 12;
  const category = searchParams.category;
  const type = searchParams.type;
  const search = searchParams.search;
  const sort = searchParams.sort || "newest";
  const inStock = searchParams.in_stock;

  const conditions: any[] = [eq(products.isActive, true)];
  if (type) conditions.push(eq(products.productType, type));

  if (category) {
    const cat = await (db as any).query.categories.findFirst({
      where: eq(categories.slug, category),
    });
    if (cat) conditions.push(eq(products.categoryId, cat.id));
  }

  if (search) {
    conditions.push(or(like(products.name, `%${search}%`), like(products.description, `%${search}%`))!);
  }

  const allProducts = await (db as any)
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      shortDescription: products.shortDescription,
      imageUrl: products.imageUrl,
      productType: products.productType,
      isFeatured: products.isFeatured,
      createdAt: products.createdAt,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      minPrice: sql`MIN(${productVariants.price})`,
      maxStock: sql`MAX(${productVariants.stock})`,
      variantCount: sql`COUNT(${productVariants.id})`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
    .where(and(...conditions))
    .groupBy(products.id);

  let filtered = allProducts;
  if (inStock === "true") filtered = filtered.filter((p: any) => p.maxStock > 0);

  filtered.sort((a: any, b: any) => {
    switch (sort) {
      case "price_asc": return a.minPrice - b.minPrice;
      case "price_desc": return b.minPrice - a.minPrice;
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      default: return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const data = paginated.map((p: any) => ({
    id: p.id, name: p.name, slug: p.slug, shortDescription: p.shortDescription,
    imageUrl: p.imageUrl, productType: p.productType, isFeatured: p.isFeatured,
    category: { id: p.categoryId, name: p.categoryName, slug: p.categorySlug },
    priceFrom: p.minPrice, inStock: p.maxStock > 0, variantsCount: p.variantCount,
  }));

  return { products: data, pagination: { page, limit, total, totalPages } };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const [categoriesList, data] = await Promise.all([getCategories(), getProducts(params)]);
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
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-4">No products match your criteria.</p>
              <a href="/products" className="text-green-700 hover:text-green-800 text-sm font-medium">Clear filters</a>
            </div>
          )}
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
