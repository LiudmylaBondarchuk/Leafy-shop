import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { compareSync, hashSync } from "bcryptjs";
import { getCustomerFromCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return apiError("Not authenticated", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError("Current password and new password are required", 400, "VALIDATION_ERROR");
    }

    if (newPassword.length < 8) {
      return apiError("New password must be at least 8 characters", 400, "VALIDATION_ERROR");
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, Number(payload.sub)),
    });

    if (!customer) {
      return apiError("Customer not found", 404, "NOT_FOUND");
    }

    const passwordValid = compareSync(currentPassword, customer.passwordHash);
    if (!passwordValid) {
      return apiError("Current password is incorrect", 401, "INVALID_CREDENTIALS");
    }

    const newHash = hashSync(newPassword, 12);
    await db.update(customers).set({
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    }).where(eq(customers.id, Number(payload.sub)));

    return apiSuccess({ message: "Password changed successfully" });
  } catch (error) {
    console.error("POST /api/customer/change-password error:", error);
    return apiError("Failed to change password", 500);
  }
}
