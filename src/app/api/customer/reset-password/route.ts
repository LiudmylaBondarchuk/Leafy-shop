import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return apiError("Reset token is required", 400, "VALIDATION_ERROR");
    }
    if (!password || password.length < 8) {
      return apiError("Password must be at least 8 characters", 400, "VALIDATION_ERROR");
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.resetToken, token),
    });

    if (!customer) {
      return apiError("Invalid or expired reset token", 400, "INVALID_TOKEN");
    }

    // Clear token immediately (single-use: invalidate on any attempt)
    await db.update(customers).set({
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(customers.id, customer.id));

    if (!customer.resetTokenExpiry || new Date(customer.resetTokenExpiry) < new Date()) {
      return apiError("Reset token has expired", 400, "TOKEN_EXPIRED");
    }

    const passwordHash = hashSync(password, 10);

    await db.update(customers).set({
      passwordHash,
      updatedAt: new Date().toISOString(),
    }).where(eq(customers.id, customer.id));

    return apiSuccess({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("POST /api/customer/reset-password error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to reset password", 500);
  }
}
