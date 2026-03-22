import { db } from "@/lib/db";
import { discountCodes, adminUsers } from "@/lib/db/schema-pg";
import { desc, eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  try {
    const codes = await db
      .select()
      .from(discountCodes)
      .orderBy(desc(discountCodes.createdAt));

    // If admin is logged in as tester, only show their codes
    const admin = await getAdminFromCookie();
    if (admin) {
      const user = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, Number(admin.sub)),
      });
      if (user?.role === "tester") {
        return apiSuccess(codes.filter((c: any) => c.createdBy === Number(admin.sub)));
      }
    }

    return apiSuccess(codes);
  } catch (error) {
    console.error("GET /api/discount-codes error:", error);
    return apiError("Failed to fetch discount codes", 500);
  }
}
