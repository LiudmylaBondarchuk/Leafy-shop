import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const code = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, parseInt(id)),
      with: { category: true },
    });
    if (!code) return apiError("Discount code not found", 404);
    return apiSuccess(code);
  } catch (error) {
    console.error("GET /api/admin/discounts/[id] error:", error);
    return apiError("Failed to fetch discount code", 500);
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
    const { code, description, type, value, minOrderValue, maxDiscount, categoryId, usageLimit, startsAt, expiresAt, isActive } = body;

    if (type !== "free_shipping" && (!value || value <= 0)) {
      return apiError("Value must be greater than 0", 400, "VALIDATION_ERROR");
    }

    if (expiresAt && startsAt && new Date(expiresAt) <= new Date(startsAt)) {
      return apiError("Expiry date must be after start date", 400, "VALIDATION_ERROR");
    }

    // Check unique code (exclude self)
    if (code) {
      const existing = await db.query.discountCodes.findFirst({
        where: eq(discountCodes.code, code.trim().toUpperCase()),
      });
      if (existing && existing.id !== parseInt(id)) {
        return apiError("A discount code with this name already exists", 409, "DUPLICATE");
      }
    }

    await db.update(discountCodes).set({
      code: code ? code.trim().toUpperCase() : undefined,
      description: description ?? null,
      type,
      value: type === "free_shipping" ? 0 : value,
      minOrderValue: minOrderValue || null,
      maxDiscount: maxDiscount || null,
      categoryId: categoryId || null,
      usageLimit: usageLimit || null,
      startsAt: startsAt || new Date().toISOString(),
      expiresAt: expiresAt || null,
      isActive: isActive ?? true,
    }).where(eq(discountCodes.id, parseInt(id)));

    const updated = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, parseInt(id)),
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("PUT /api/admin/discounts/[id] error:", error);
    return apiError("Failed to update discount code", 500);
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
    await db.update(discountCodes)
      .set({ isActive: false })
      .where(eq(discountCodes.id, parseInt(id)));
    return apiSuccess({ message: "Discount code deactivated" });
  } catch (error) {
    console.error("DELETE /api/admin/discounts/[id] error:", error);
    return apiError("Failed to deactivate discount code", 500);
  }
}
