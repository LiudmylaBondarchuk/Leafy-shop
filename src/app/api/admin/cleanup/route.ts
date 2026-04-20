import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { runTestDataCleanup } from "@/lib/cleanup-test-data";
import { revalidatePath } from "next/cache";

export async function POST() {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, Number(admin.sub)),
  });

  if (!user) return apiError("User not found", 404);
  if (user.role === "tester") {
    return apiError("Testers cannot trigger cleanup", 403, "FORBIDDEN");
  }

  try {
    const summary = await runTestDataCleanup();
    console.log(`[ADMIN] Test data cleanup triggered by ${user.email}:`, summary);
    revalidatePath("/", "layout");
    return apiSuccess(summary);
  } catch (error) {
    console.error("[ADMIN] Cleanup error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Cleanup failed", 500);
  }
}
