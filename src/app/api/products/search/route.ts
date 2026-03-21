import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema-pg";
import { eq, and, like, or, sql } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return apiSuccess([]);
    }

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
          or(
            like(products.name, `%${q}%`),
            like(products.description, `%${q}%`)
          )
        )
      )
      .groupBy(products.id)
      .limit(5);

    return apiSuccess(results);
  } catch (error) {
    console.error("GET /api/products/search error:", error);
    return apiError("Search failed", 500);
  }
}
