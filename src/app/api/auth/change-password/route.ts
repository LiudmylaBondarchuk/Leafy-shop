import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

/**
 * POST /api/auth/change-password
 * Allows any authenticated user to change their own password.
 * No special permissions required — users can always change their own password.
 * When called, mustChangePassword is automatically set to false.
 */
export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return apiError("Password is required", 400);
    }
    if (password.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return apiError("Password must contain at least one uppercase letter, one lowercase letter, and one number", 400);
    }

    const userId = Number(admin.sub);
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
