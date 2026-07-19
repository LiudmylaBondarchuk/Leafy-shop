import { db } from "@/lib/db";
import { discountCodes, adminUsers } from "@/lib/db/schema-pg";
import { desc, eq } from "drizzle-orm";
import { authorize } from "@/lib/require-permission";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const denied = await authorize("discounts.view");
  if (denied) return denied;

  try {
    // Join with admin_users to get creator name
    const codes = await db
      .select({
        id: discountCodes.id,
        code: discountCodes.code,
        description: discountCodes.description,
        type: discountCodes.type,
        value: discountCodes.value,
        minOrderValue: discountCodes.minOrderValue,
        maxDiscount: discountCodes.maxDiscount,
        categoryId: discountCodes.categoryId,
        usageLimit: discountCodes.usageLimit,
        usageCount: discountCodes.usageCount,
        startsAt: discountCodes.startsAt,
        expiresAt: discountCodes.expiresAt,
        isActive: discountCodes.isActive,
        isTestData: discountCodes.isTestData,
        createdBy: discountCodes.createdBy,
        deletedAt: discountCodes.deletedAt,
        createdAt: discountCodes.createdAt,
        creatorName: adminUsers.name,
      })
      .from(discountCodes)
      .leftJoin(adminUsers, eq(discountCodes.createdBy, adminUsers.id))
      .orderBy(desc(discountCodes.createdAt));

    // Only staff with discounts.view reach here — return the full list.
    // (Codes are never exposed to unauthenticated/storefront requests.)
    return apiSuccess(codes.filter((c: any) => !c.deletedAt));
  } catch (error) {
    console.error("GET /api/discount-codes error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch discount codes", 500);
  }
}
