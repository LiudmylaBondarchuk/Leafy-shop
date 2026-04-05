import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema-pg";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return apiSuccess([]);
    }

    const searchTerm = q.trim().toLowerCase();

    const results = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: products.imageUrl,
        productType: products.productType,
        priceFrom: sql<number>`MIN(${productVariants.price})`,
      })
      .from(products)
      .innerJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
      .where(
        and(
          eq(products.isActive, true),
          eq(products.isTestData, false),
          or(
            ilike(products.name, `%${searchTerm}%`),
            ilike(products.description, `%${searchTerm}%`)
          )
        )
      )
      .groupBy(products.id, products.name, products.slug, products.imageUrl, products.productType)
      .limit(5);

    return apiSuccess(results);
  } catch (error) {
    console.error("GET /api/products/search error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Search failed", 500);
  }
}
