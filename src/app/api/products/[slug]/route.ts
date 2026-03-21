import { db } from "@/lib/db";
import { products, productVariants, categories } from "@/lib/db/schema-pg";
import { eq, and } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.isActive, true)),
      with: {
        category: true,
        variants: {
          where: eq(productVariants.isActive, true),
          orderBy: [productVariants.weightGrams, productVariants.grindType],
        },
      },
    });

    if (!product) {
      return apiError("Product not found", 404, "NOT_FOUND");
    }

    // Get related products from same category
    const related = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        shortDescription: products.shortDescription,
        imageUrl: products.imageUrl,
        productType: products.productType,
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, product.categoryId),
          eq(products.isActive, true),
        )
      )
      .limit(5);

    const relatedFiltered = related.filter((p: any) => p.id !== product.id).slice(0, 4);

    return apiSuccess({
      ...product,
      relatedProducts: relatedFiltered,
    });
  } catch (error) {
    console.error("GET /api/products/[slug] error:", error);
    return apiError("Failed to fetch product", 500);
  }
}
