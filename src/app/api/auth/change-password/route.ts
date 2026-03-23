import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync, compareSync } from "bcryptjs";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

/**
 * POST /api/auth/change-password
 * Two modes:
 * - Forced (mustChangePassword=true): only newPassword required, rejects same password
 * - Voluntary (from sidebar): currentPassword + newPassword required
 */
export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const { currentPassword, password } = body;
    const userId = Number(admin.sub);

    // Get current user
    const user = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, userId),
    });
    if (!user) return apiError("User not found", 404);

    const isForced = user.mustChangePassword === true;

    // Voluntary change requires current password
    if (!isForced) {
      if (!currentPassword) {
        return apiError("Current password is required", 400);
      }
      if (!compareSync(currentPassword, user.passwordHash)) {
        return apiError("Current password is incorrect", 400);
      }
    }

    // Validate new password
    if (!password || typeof password !== "string") {
      return apiError("New password is required", 400);
    }
    if (password.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return apiError("Password must contain at least one uppercase letter, one lowercase letter, and one number", 400);
    }

    // Reject same password as current
    if (compareSync(password, user.passwordHash)) {
      return apiError("New password must be different from the current password", 400);
    }

    const passwordHash = hashSync(password, 12);

    await db
      .update(adminUsers)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(adminUsers.id, userId));

    return apiSuccess({ message: "Password changed successfully" });
  } catch (error) {
    console.error(
      "POST /api/auth/change-password error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return apiError("Failed to change password", 500);
  }
}
