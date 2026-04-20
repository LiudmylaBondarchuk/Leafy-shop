import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { getAdminFromCookie } from "@/lib/auth";
import { hasPermission } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/utils";
import { logAudit, detectChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    if (isNaN(parseInt(id))) return apiError("Invalid ID", 400);

    const user = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, parseInt(id)),
    });
    if (!user) return apiError("User not found", 404);

    return apiSuccess({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: JSON.parse(user.permissions || "[]"),
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch user", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return apiError("Invalid ID", 400);

    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });

    if (!requestingUser || !hasPermission(requestingUser.role, JSON.parse(requestingUser.permissions || "[]"), "users.manage")) {
      return apiError("No permission", 403, "FORBIDDEN");
    }

    const body = await request.json();

    const targetUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, userId),
    });
    if (!targetUser) return apiError("User not found", 404);

    // Can't edit admin if you're not admin
    if (targetUser.role === "admin" && requestingUser.role !== "admin") {
      return apiError("Only admins can edit admin accounts", 403, "FORBIDDEN");
    }

    // Can't demote yourself
    if (userId === Number(admin.sub)) {
      if (body.role && body.role !== requestingUser.role) {
        return apiError("You can't change your own role", 403, "FORBIDDEN");
      }
      if (body.isActive === false) {
        return apiError("You can't deactivate yourself", 403, "FORBIDDEN");
      }
    }
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.role !== undefined) {
      if (requestingUser.role !== "admin" && body.role === "admin") {
        return apiError("Only admins can grant admin role", 403, "FORBIDDEN");
      }
      updateData.role = body.role;
    }
    if (body.permissions !== undefined) {
      if (requestingUser.role !== "admin") {
        const myPerms = JSON.parse(requestingUser.permissions || "[]");
        for (const perm of body.permissions) {
          if (!myPerms.includes(perm)) {
            return apiError(`Can't grant "${perm}" — you don't have it`, 403, "FORBIDDEN");
          }
        }
      }
      updateData.permissions = JSON.stringify(body.permissions);
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.mustChangePassword !== undefined) updateData.mustChangePassword = body.mustChangePassword;
    if (body.password) {
      updateData.passwordHash = hashSync(body.password, 12);
      if (body.mustChangePassword === undefined) updateData.mustChangePassword = false;
    }

    await db.update(adminUsers).set(updateData).where(eq(adminUsers.id, userId));

    // Audit log
    logAudit({
      userId: Number(admin.sub),
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "update",
      entityType: "user",
      entityId: userId,
      entityName: targetUser.name || "Unknown",
      changes: detectChanges(
        { name: targetUser.name, role: targetUser.role, isActive: targetUser.isActive, permissions: targetUser.permissions },
        { name: updateData.name, role: updateData.role, isActive: updateData.isActive, permissions: updateData.permissions },
        ["name", "role", "isActive", "permissions"]
      ),
      isTestData: requestingUser?.role === "tester",
    });

    revalidatePath("/management", "layout");
    return apiSuccess({ message: "User updated" });
  } catch (error) {
    console.error("PUT /api/admin/users/[id] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to update user", 500);
  }
}
