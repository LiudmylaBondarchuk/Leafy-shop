import { db } from "@/lib/db";
import { settings, adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { hasPermission } from "@/constants/permissions";
import { apiSuccess, apiError } from "@/lib/utils";

async function checkPermission(permission: string) {
  const admin = await getAdminFromCookie();
  if (!admin) return { allowed: false, error: apiError("Unauthorized", 401, "UNAUTHORIZED") };
  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, Number(admin.sub)) });
  if (!user) return { allowed: false, error: apiError("User not found", 404) };
  const perms = user.permissions ? JSON.parse(user.permissions) : [];
  if (!hasPermission(user.role, perms, permission)) {
    return { allowed: false, error: apiError("Insufficient permissions", 403) };
  }
  return { allowed: true, error: null };
}

export async function GET() {
  const check = await checkPermission("settings.view");
  if (!check.allowed) return check.error!;

  try {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }
    return apiSuccess(settingsMap);
  } catch (error) {
    console.error("GET /api/admin/settings error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch settings", 500);
  }
}

export async function PUT(request: Request) {
  const check = await checkPermission("settings.edit");
  if (!check.allowed) return check.error!;

  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        await db.update(settings)
          .set({ value: String(value), updatedAt: new Date().toISOString() })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          key,
          value: String(value),
        });
      }
    }

    return apiSuccess({ message: "Settings updated" });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to update settings", 500);
  }
}
