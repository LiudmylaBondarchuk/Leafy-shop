import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const product = await db.query.products.findFirst({
      where: eq(products.id, parseInt(id)),
      with: { category: true, variants: true },
    });

    if (!product) return apiError("Product not found", 404, "NOT_FOUND");
    return apiSuccess(product);
  } catch (error) {
    console.error("GET /api/admin/products/[id] error:", error);
    return apiError("Failed to fetch product", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name, description, shortDescription, categoryId, productType,
      origin, brewTempMin, brewTempMax, brewTimeMin, brewTimeMax,
      flavorNotes, imageUrl, isActive, isFeatured, variants,
    } = body;

    const productId = parseInt(id);

    // Update product
    await db.update(products).set({
      name, description,
      shortDescription: shortDescription || null,
      categoryId, productType,
      origin: origin || null,
      brewTempMin: brewTempMin || null,
      brewTempMax: brewTempMax || null,
      brewTimeMin: brewTimeMin || null,
      brewTimeMax: brewTimeMax || null,
      flavorNotes: flavorNotes || null,
      imageUrl: imageUrl || null,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      updatedAt: new Date().toISOString(),
    }).where(eq(products.id, productId));

    // Update variants
    if (variants) {
      // Get existing variant IDs
      const existingVariants = await db.select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, productId));
      const existingIds = existingVariants.map((v: any) => v.id);

      for (const v of variants) {
        if (v.id && existingIds.includes(v.id)) {
          // Update existing
          await db.update(productVariants).set({
            weightGrams: v.weightGrams,
            grindType: v.grindType || null,
            price: v.price,
            cost: v.cost || null,
            comparePrice: v.comparePrice || null,
            sku: v.sku,
            stock: v.stock ?? 0,
            isActive: v.isActive ?? true,
          }).where(eq(productVariants.id, v.id));
        } else {
          // Insert new
          await db.insert(productVariants).values({
            productId,
            weightGrams: v.weightGrams,
            grindType: v.grindType || null,
            price: v.price,
            cost: v.cost || null,
            comparePrice: v.comparePrice || null,
            sku: v.sku || `variant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            stock: v.stock ?? 0,
            isActive: true,
          });
        }
      }

      // Deactivate removed variants
      const updatedIds: number[] = variants.filter((v: any) => v.id).map((v: any) => v.id);
      for (const existingId of existingIds) {
        if (!updatedIds.includes(existingId)) {
          await db.update(productVariants)
            .set({ isActive: false })
            .where(eq(productVariants.id, existingId));
        }
      }
    }

    const updated = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: { category: true, variants: true },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("PUT /api/admin/products/[id] error:", error);
    return apiError("Failed to update product", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    await db.update(products)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(products.id, parseInt(id)));

    return apiSuccess({ message: "Product deactivated" });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] error:", error);
    return apiError("Failed to delete product", 500);
  }
}
