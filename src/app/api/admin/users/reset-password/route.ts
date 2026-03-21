import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import crypto from "crypto";
import { getAdminFromCookie } from "@/lib/auth";
import { hasPermission } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });

    if (!requestingUser || !hasPermission(requestingUser.role, JSON.parse(requestingUser.permissions || "[]"), "users.manage")) {
      return apiError("No permission", 403, "FORBIDDEN");
    }

    const { userId } = await request.json();
    if (!userId) return apiError("User ID required", 400);

    const targetUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, userId),
    });
    if (!targetUser) return apiError("User not found", 404);

    // Can't reset admin password if you're not admin
    if (targetUser.role === "admin" && requestingUser.role !== "admin") {
      return apiError("Only admins can reset admin passwords", 403);
    }

    // Generate new password
    const newPassword = crypto.randomBytes(12).toString("base64url").slice(0, 16);
    const passwordHash = hashSync(newPassword, 12);

    await db.update(adminUsers).set({
      passwordHash,
      mustChangePassword: true,
    }).where(eq(adminUsers.id, userId));

    // Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";
    sendPasswordResetEmail(
      targetUser.email,
      targetUser.name,
      newPassword,
      `${appUrl}/admin/login`,
    ).catch(() => {});

    return apiSuccess({ message: "Password reset email sent" });
  } catch (error) {
    console.error("POST /api/admin/users/reset-password error:", error);
    return apiError("Failed to reset password", 500);
  }
}
