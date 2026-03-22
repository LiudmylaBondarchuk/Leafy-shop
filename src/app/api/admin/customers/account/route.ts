import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function PUT(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const { accountId, firstName, lastName, phone } = body;

    if (!accountId) return apiError("Account ID is required", 400);

    const existing = await db.select().from(customers).where(eq(customers.id, accountId));
    if (existing.length === 0) return apiError("Customer account not found", 404);

    await db
      .update(customers)
      .set({
        firstName: firstName ?? existing[0].firstName,
        lastName: lastName ?? existing[0].lastName,
        phone: phone ?? existing[0].phone,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customers.id, accountId));

    return apiSuccess({ id: accountId });
  } catch (error) {
    console.error("PUT /api/admin/customers/account error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to update customer account", 500);
  }
}
