import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { getCustomerFromCookie, deleteCustomerCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const customer = await getCustomerFromCookie();
  if (!customer) return apiError("Not authenticated", 401);

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return apiError("Password confirmation is required to delete your account", 400, "VALIDATION_ERROR");
    }

    // Verify password against stored hash
    const customerRecord = await db.query.customers.findFirst({
      where: eq(customers.id, Number(customer.sub)),
    });

    if (!customerRecord) {
      return apiError("Customer not found", 404, "NOT_FOUND");
    }

    if (!compareSync(password, customerRecord.passwordHash)) {
      return apiError("Incorrect password", 403, "FORBIDDEN");
    }

    // Soft delete — set deletedAt, clear sensitive data
    await db.update(customers).set({
      deletedAt: new Date().toISOString(),
      passwordHash: "DELETED",
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(customers.id, Number(customer.sub)));

    // Clear cookie
    const cookieStore = await cookies();
    const cookie = deleteCustomerCookie();
    cookieStore.set(cookie.name, cookie.value, cookie);

    return apiSuccess({ message: "Account deleted" });
  } catch (error) {
    console.error("POST /api/customer/delete-account error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to delete account", 500);
  }
}
