import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { hasPermission, type Permission } from "@/constants/permissions";
import { apiError } from "@/lib/utils";

/**
 * Authorize a privileged request against a specific permission.
 *
 * Middleware only verifies that the admin token is valid — it does NOT check
 * roles or permissions. Every /api/admin handler must call this, otherwise a
 * valid tester/manager token reaches data or actions it has no rights to.
 *
 * Returns an error Response to return immediately, or null when authorized.
 */
export async function authorize(permission: Permission) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, Number(admin.sub)),
  });
  if (!user) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const perms = user.permissions ? JSON.parse(user.permissions) : [];
  if (!hasPermission(user.role, perms, permission)) {
    return apiError("Insufficient permissions", 403);
  }

  return null;
}
