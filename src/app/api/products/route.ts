import { db } from "@/lib/db";
import { products, productVariants, categories } from "@/lib/db/schema";
import { eq, and, like, or, gte, lte, sql, desc, asc } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "newest";
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const inStock = searchParams.get("in_stock");

    // Build conditions
    const conditions = [eq(products.isActive, true)];

    if (type) {
      conditions.push(eq(products.productType, type));
    }

    if (category) {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, category),
      });
      if (cat) {
        conditions.push(eq(products.categoryId, cat.id));
      }
    }

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`)
        )!
      );
    }

    // Get all matching products with their min price
    const allProducts = await db
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
        minPrice: sql<number>`MIN(${productVariants.price})`.as("min_price"),
        maxStock: sql<number>`MAX(${productVariants.stock})`.as("max_stock"),
        variantCount: sql<number>`COUNT(${productVariants.id})`.as("variant_count"),
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
      .where(and(...conditions))
      .groupBy(products.id);

    // Filter by price and stock in memory (after aggregation)
    let filtered = allProducts;

    if (minPrice) {
      const min = parseInt(minPrice);
      filtered = filtered.filter((p) => p.minPrice >= min);
    }
    if (maxPrice) {
      const max = parseInt(maxPrice);
      filtered = filtered.filter((p) => p.minPrice <= max);
    }
    if (inStock === "true") {
      filtered = filtered.filter((p) => p.maxStock > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sort) {
        case "price_asc": return a.minPrice - b.minPrice;
        case "price_desc": return b.minPrice - a.minPrice;
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "newest":
        default: return b.createdAt.localeCompare(a.createdAt);
      }
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    const data = paginated.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      imageUrl: p.imageUrl,
      productType: p.productType,
      isFeatured: p.isFeatured,
      category: { id: p.categoryId, name: p.categoryName, slug: p.categorySlug },
      priceFrom: p.minPrice,
      inStock: p.maxStock > 0,
      variantsCount: p.variantCount,
    }));

    return apiSuccess({
      products: data,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return apiError("Failed to fetch products", 500);
  }
}
