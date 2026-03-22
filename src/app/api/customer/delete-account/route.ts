import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getCustomerFromCookie, deleteCustomerCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";

export async function POST() {
  const customer = await getCustomerFromCookie();
  if (!customer) return apiError("Not authenticated", 401);

  try {
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
    console.error("POST /api/customer/delete-account error:", error);
    return apiError("Failed to delete account", 500);
  }
}
