import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema-pg";
import { eq, count, and } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  try {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        sortOrder: categories.sortOrder,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.isActive, true)))
      .groupBy(categories.id, categories.name, categories.slug, categories.description, categories.imageUrl, categories.sortOrder)
      .orderBy(categories.sortOrder);

    return apiSuccess(result);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return apiError("Failed to fetch categories", 500);
  }
}
