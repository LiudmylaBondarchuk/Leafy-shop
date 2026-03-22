import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq, and } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import crypto from "crypto";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST() {
  try {
    // Find any active tester account
    const allUsers: any[] = await db.select().from(adminUsers);
    const tester = allUsers.find((u) => u.role === "tester" && u.isActive && !u.deletedAt);

    if (!tester) {
      return apiError("No active tester account found. Ask an admin to create one.", 404, "NO_TESTER");
    }

    // Generate one-time password
    const password = crypto.randomBytes(8).toString("base64url").slice(0, 12);
    const passwordHash = hashSync(password, 12);

    // Update tester password (one-time, no mustChangePassword)
    await db.update(adminUsers).set({
      passwordHash,
      mustChangePassword: false,
    }).where(eq(adminUsers.id, tester.id));

    return apiSuccess({
      email: tester.email,
      name: tester.name,
      password,
    });
  } catch (error) {
    console.error("POST /api/auth/generate-test-password error:", error);
    return apiError("Failed to generate test password", 500);
  }
}
