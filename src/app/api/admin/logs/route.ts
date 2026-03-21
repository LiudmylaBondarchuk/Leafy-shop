import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema-pg";
import { desc } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
    return apiSuccess(logs.map((l: any) => ({
      ...l,
      changes: l.changes ? JSON.parse(l.changes) : null,
    })));
  } catch (error) {
    console.error("GET /api/admin/logs error:", error);
    return apiError("Failed to fetch logs", 500);
  }
}
