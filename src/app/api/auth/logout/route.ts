import { deleteAuthCookie, getAdminFromCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/utils";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import crypto from "crypto";

export async function POST() {
  // If tester, invalidate their password on logout
  try {
    const admin = await getAdminFromCookie();
    if (admin) {
      const user = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, Number(admin.sub)),
      });
      if (user?.role === "tester") {
        // Set a random password so the old one can't be reused
        const randomPassword = crypto.randomBytes(32).toString("base64url");
        await db.update(adminUsers).set({
          passwordHash: hashSync(randomPassword, 12),
        }).where(eq(adminUsers.id, user.id));
      }
    }
  } catch {
    // Don't block logout if this fails
  }

  const cookieStore = await cookies();
  const cookie = deleteAuthCookie();
  cookieStore.set(cookie.name, cookie.value, cookie);
  return apiSuccess({ message: "Logged out" });
}
