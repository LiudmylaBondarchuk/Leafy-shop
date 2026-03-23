import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { signToken, createAuthCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import { loginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = `login:${ip}`;
    const { success, lockedUntil } = loginRateLimit(rateLimitKey);
    if (!success) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many attempts. Account locked for 5 minutes.",
          lockedUntil,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, mode } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400, "VALIDATION_ERROR");
    }

    const user = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, email.trim().toLowerCase()),
    });

    if (!user || !user.isActive) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Testers can only log in through the Tester tab
    if (user.role === "tester" && mode !== "tester") {
      return apiError("Tester accounts must use the Tester login tab", 401, "INVALID_CREDENTIALS");
    }

    const passwordValid = compareSync(password, user.passwordHash);
    if (!passwordValid) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Successful login — clear rate limit counter
    resetLoginRateLimit(rateLimitKey);

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
    console.error("POST /api/auth/login error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Login failed", 500);
  }
}
