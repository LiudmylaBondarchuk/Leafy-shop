import { db } from "@/lib/db";
import { discountCodes, adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { logAudit, detectChanges } from "@/lib/audit";

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

    // Tester can only edit their own discounts
    const testerCheckUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    if (testerCheckUser?.role === "tester") {
      const discount = await db.query.discountCodes.findFirst({ where: eq(discountCodes.id, parseInt(id)) });
      if (discount?.createdBy !== Number(admin.sub)) {
        return apiError("You can only edit discounts you created.", 403, "FORBIDDEN");
      }
    }

    // Fetch old for change detection
    const oldDiscount = await db.query.discountCodes.findFirst({ where: eq(discountCodes.id, parseInt(id)) });

    // If only toggling isActive, skip full validation
    const isToggleOnly = Object.keys(body).length === 1 && "isActive" in body;

    if (!isToggleOnly) {
      if (type && type !== "free_shipping" && (!value || value <= 0)) {
        return apiError("Value must be greater than 0", 400, "VALIDATION_ERROR");
      }
      if (expiresAt && startsAt && new Date(expiresAt) <= new Date(startsAt)) {
        return apiError("Expiry date must be after start date", 400, "VALIDATION_ERROR");
      }
      if (code) {
        const existing = await db.query.discountCodes.findFirst({
          where: eq(discountCodes.code, code.trim().toUpperCase()),
        });
        if (existing && existing.id !== parseInt(id)) {
          return apiError("A discount code with this name already exists", 409, "DUPLICATE");
        }
      }
    }

    // Build update object — only include fields that were sent
    const updateData: any = {};
    if ("isActive" in body) updateData.isActive = isActive;
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (description !== undefined) updateData.description = description || null;
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = type === "free_shipping" ? 0 : value;
    if (minOrderValue !== undefined) updateData.minOrderValue = minOrderValue || null;
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit || null;
    if (startsAt !== undefined) updateData.startsAt = startsAt;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt || null;

    await db.update(discountCodes).set(updateData).where(eq(discountCodes.id, parseInt(id)));

    const updated = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, parseInt(id)),
    });

    // Audit log
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    logAudit({
      userId: Number(admin.sub),
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "update",
      entityType: "discount",
      entityId: parseInt(id),
      entityName: updated?.code || "Unknown",
      changes: detectChanges(oldDiscount || {}, updateData, ["code", "type", "value", "isActive", "expiresAt"]),
      isTestData: requestingUser?.role === "tester",
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
    const discountId = parseInt(id);

    // Fetch discount info before deleting
    const discount = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, discountId),
    });

    // Tester can only delete their own discounts
    const delUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    if (delUser?.role === "tester" && discount?.createdBy !== Number(admin.sub)) {
      return apiError("You can only delete discounts you created.", 403, "FORBIDDEN");
    }

    // Soft delete
    await db.update(discountCodes)
      .set({ deletedAt: new Date().toISOString(), isActive: false })
      .where(eq(discountCodes.id, discountId));

    // Audit log
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    logAudit({
      userId: Number(admin.sub),
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "delete",
      entityType: "discount",
      entityId: discountId,
      entityName: discount?.code || "Unknown",
      isTestData: requestingUser?.role === "tester",
    });

    return apiSuccess({ message: "Discount code deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/discounts/[id] error:", error);
    return apiError("Failed to deactivate discount code", 500);
  }
}
