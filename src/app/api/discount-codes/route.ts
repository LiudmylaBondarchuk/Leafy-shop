import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema-pg";
import { desc } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  try {
    const codes = await db
      .select()
      .from(discountCodes)
      .orderBy(desc(discountCodes.createdAt));

    return apiSuccess(codes);
  } catch (error) {
    console.error("GET /api/discount-codes error:", error);
    return apiError("Failed to fetch discount codes", 500);
  }
}
