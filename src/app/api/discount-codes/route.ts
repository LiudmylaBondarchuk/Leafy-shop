import { db } from "@/lib/db";
import { discountCodes, adminUsers } from "@/lib/db/schema-pg";
import { desc, eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
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

    const admin = await getAdminFromCookie();
    if (admin) {
      const user = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, Number(admin.sub)),
      });
      if (user?.role === "tester") {
        // Tester sees only their own codes
        return apiSuccess(codes.filter((c: any) => c.createdBy === Number(admin.sub)));
      }
      // Admin and manager see ALL codes (including inactive/expired)
      return apiSuccess(codes.filter((c: any) => !c.deletedAt));
    }

    // Unauthenticated requests only get active, non-expired, non-deleted codes
    const now = new Date().toISOString();
    return apiSuccess(codes.filter((c: any) => c.isActive && !c.deletedAt && (!c.expiresAt || c.expiresAt > now)));
  } catch (error) {
    console.error("GET /api/discount-codes error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch discount codes", 500);
  }
}
