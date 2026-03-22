import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { signToken, createAuthCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`login:${ip}`, 5, 60000);
    if (!success) return apiError("Too many requests. Please try again later.", 429);

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400, "VALIDATION_ERROR");
    }

    const user = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email.trim().toLowerCase()),
    });

    if (!user || !user.isActive) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const passwordValid = compareSync(password, user.passwordHash);
    if (!passwordValid) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Update last login
    await db.update(adminUsers).set({ lastLoginAt: new Date().toISOString() }).where(eq(adminUsers.id, user.id));

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });

    const cookieStore = await cookies();
    const cookie = createAuthCookie(token);
    cookieStore.set(cookie.name, cookie.value, cookie);

    return apiSuccess({
      user: { id: user.id, email: user.email, name: user.name },
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return apiError("Login failed", 500);
  }
}
