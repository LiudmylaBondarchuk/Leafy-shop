import { db } from "@/lib/db";
import { products, productVariants, adminUsers } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const {
      name, description, shortDescription, categoryId, productType,
      origin, brewTempMin, brewTempMax, brewTimeMin, brewTimeMax,
      flavorNotes, imageUrl, isActive, isFeatured, variants,
    } = body;

    if (!name || !description || !categoryId || !productType) {
      return apiError("Name, description, category, and type are required", 400, "VALIDATION_ERROR");
    }

    // Get requesting user info for audit
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    const isTester = requestingUser?.role === "tester";

    // Generate unique slug
    let slug = slugify(name);
    const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) });
    if (existing) slug = `${slug}-${Date.now()}`;

    // Insert product
    const [product] = await db.insert(products).values({
      name, slug, description,
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
      isTestData: isTester,
      createdBy: Number(admin.sub),
    }).returning();

    // Insert variants
    if (variants && variants.length > 0) {
      for (const v of variants) {
        await db.insert(productVariants).values({
          productId: product.id,
          weightGrams: v.weightGrams,
          grindType: v.grindType || null,
          price: v.price,
          cost: v.cost || null,
          comparePrice: v.comparePrice || null,
          sku: v.sku || `${slug}-${v.weightGrams}-${Date.now()}`,
          stock: v.stock ?? 0,
          isActive: true,
        });
      }
    }

    // Audit log
    logAudit({
      userId: Number(admin.sub),
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "create",
      entityType: "product",
      entityId: product.id,
      entityName: name,
      isTestData: isTester,
    });

    return apiSuccess(product, 201);
  } catch (error) {
    console.error("POST /api/admin/products error:", error);
    return apiError("Failed to create product", 500);
  }
}
