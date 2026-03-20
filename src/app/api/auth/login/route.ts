import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { signToken, createAuthCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
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

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });

    const cookieStore = await cookies();
    const cookie = createAuthCookie(token);
    cookieStore.set(cookie.name, cookie.value, cookie);

    return apiSuccess({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return apiError("Login failed", 500);
  }
}
