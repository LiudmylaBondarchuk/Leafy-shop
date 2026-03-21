import { db } from "@/lib/db";
import { products, productVariants, categories } from "@/lib/db/schema-pg";
import { eq, and, sql } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: products.imageUrl,
        productType: products.productType,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        categoryId: categories.id,
        categoryName: categories.name,
        minPrice: sql<number>`MIN(${productVariants.price})`,
        totalStock: sql<number>`SUM(${productVariants.stock})`,
        variantCount: sql<number>`COUNT(${productVariants.id})`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
      .groupBy(
        products.id, products.name, products.slug, products.imageUrl,
        products.productType, products.isActive, products.isFeatured,
        categories.id, categories.name
      )
      .orderBy(products.name);

    const data = allProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      productType: p.productType,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      category: { id: p.categoryId, name: p.categoryName },
      priceFrom: p.minPrice || 0,
      totalStock: p.totalStock || 0,
      inStock: (p.totalStock || 0) > 0,
      variantsCount: p.variantCount || 0,
    }));

    return apiSuccess(data);
  } catch (error) {
    console.error("GET /api/admin/products/list error:", error);
    return apiError("Failed to fetch products", 500);
  }
}
