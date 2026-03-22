import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import crypto from "crypto";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

// Fixed tester account — configured via env variables
const TESTER_EMAIL = process.env.TESTER_EMAIL || "tester@leafyshop.eu";
const TESTER_NAME = process.env.TESTER_NAME || "Leafy Tester";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`generate-test-password:${ip}`, 3, 60000);
    if (!success) return apiError("Too many requests. Please try again later.", 429);
    // Find the fixed tester account by email
    const tester = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, TESTER_EMAIL),
    });

    if (!tester) {
      return apiError(`Tester account (${TESTER_EMAIL}) not found. Ask an admin to create it.`, 404, "NO_TESTER");
    }

    if (!tester.isActive || tester.deletedAt) {
      return apiError("Tester account is inactive. Contact admin.", 403, "TESTER_INACTIVE");
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
      email: TESTER_EMAIL,
      name: TESTER_NAME,
      password,
    });
  } catch (error) {
    console.error("POST /api/auth/generate-test-password error:", error);
    return apiError("Failed to generate test password", 500);
  }
}
