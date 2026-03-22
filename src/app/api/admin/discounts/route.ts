import { db } from "@/lib/db";
import { discountCodes, adminUsers } from "@/lib/db/schema-pg";
import { eq, and, isNull } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const { code, description, type, value, minOrderValue, maxDiscount, categoryId, usageLimit, startsAt, expiresAt, isActive } = body;

    if (!code || !type) {
      return apiError("Code and type are required", 400, "VALIDATION_ERROR");
    }

    if (type !== "free_shipping" && (!value || value <= 0)) {
      return apiError("Value is required and must be greater than 0", 400, "VALIDATION_ERROR");
    }

    if (type === "percentage" && (value < 1 || value > 10000)) {
      return apiError("Percentage must be between 1 and 100 (value 100-10000)", 400, "VALIDATION_ERROR");
    }

    // Check unique code
    const existing = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.code, code.trim().toUpperCase()),
    });
    if (existing) {
      return apiError("A discount code with this name already exists", 409, "DUPLICATE");
    }

    if (expiresAt && startsAt && new Date(expiresAt) <= new Date(startsAt)) {
      return apiError("Expiry date must be after start date", 400, "VALIDATION_ERROR");
    }

    // Get requesting user info for audit and test data flag
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    const isTester = requestingUser?.role === "tester";

    // Enforce tester limits
    if (isTester) {
      const existing = await db
        .select({ id: discountCodes.id })
        .from(discountCodes)
        .where(
          and(
            eq(discountCodes.createdBy, Number(admin.sub)),
            eq(discountCodes.isTestData, true),
            isNull(discountCodes.deletedAt)
          )
        );
      const settings = await getSettings();
      const limit = parseInt(settings["tester.max_discounts"] || "10", 10);
      if (existing.length >= limit) {
        return apiError(`Tester limit reached: maximum ${limit} test discounts allowed`, 403, "TESTER_LIMIT");
      }
    }

    const [created] = await db.insert(discountCodes).values({
      code: code.trim().toUpperCase(),
      description: description || null,
      type,
      value: type === "free_shipping" ? 0 : value,
      minOrderValue: minOrderValue || null,
      maxDiscount: maxDiscount || null,
      categoryId: categoryId || null,
      usageLimit: usageLimit || null,
      startsAt: startsAt || new Date().toISOString(),
      expiresAt: expiresAt || null,
      isActive: isActive ?? true,
      isTestData: isTester,
      createdBy: Number(admin.sub),
    }).returning();

    // Audit log
    logAudit({
      userId: Number(admin.sub),
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "create",
      entityType: "discount",
      entityId: created.id,
      entityName: code.trim().toUpperCase(),
      isTestData: isTester,
    });

    return apiSuccess(created, 201);
  } catch (error) {
    console.error("POST /api/admin/discounts error:", error);
    return apiError("Failed to create discount code", 500);
  }
}
