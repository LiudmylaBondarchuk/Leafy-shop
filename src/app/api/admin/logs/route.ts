import { db } from "@/lib/db";
import { auditLogs, adminUsers } from "@/lib/db/schema-pg";
import { desc, eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { hasPermission } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, Number(admin.sub)) });
  if (user) {
    const perms = user.permissions ? JSON.parse(user.permissions) : [];
    if (!hasPermission(user.role, perms, "logs.view")) {
      return apiError("Insufficient permissions", 403);
    }
  }

  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
    return apiSuccess(logs.map((l: any) => ({
      ...l,
      changes: l.changes ? JSON.parse(l.changes) : null,
    })));
  } catch (error) {
    console.error("GET /api/admin/logs error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch logs", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  // Only admin (not manager) can clear logs
  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, Number(admin.sub)),
  });
  if (!user || user.role !== "admin") {
    return apiError("Only administrators can clear logs", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    if ((body as { confirm?: boolean })?.confirm !== true) {
      return apiError("Confirmation required. Send { confirm: true } to delete all logs.", 400);
    }

    await db.delete(auditLogs);
    return apiSuccess({ message: "All logs cleared" });
  } catch (error) {
    console.error("DELETE /api/admin/logs error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to clear logs", 500);
  }
}
