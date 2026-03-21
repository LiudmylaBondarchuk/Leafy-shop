import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) {
    return apiError("Not authenticated", 401, "UNAUTHORIZED");
  }

  // Get full user data for mustChangePassword and role
  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, Number(admin.sub)),
  });

  return apiSuccess({
    user: {
      ...admin,
      role: user?.role || "manager",
      permissions: user?.permissions ? JSON.parse(user.permissions) : [],
      mustChangePassword: user?.mustChangePassword || false,
    },
  });
}
