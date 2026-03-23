import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { signCustomerToken, createCustomerCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import { loginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = `customer-login:${ip}`;
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
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400, "VALIDATION_ERROR");
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.email, email.trim().toLowerCase()),
    });

    if (!customer || customer.deletedAt) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const passwordValid = compareSync(password, customer.passwordHash);
    if (!passwordValid) {
      return apiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Successful login — clear rate limit counter
    resetLoginRateLimit(rateLimitKey);

    const token = await signCustomerToken({
      sub: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    });

    const cookieStore = await cookies();
    const cookie = createCustomerCookie(token);
    cookieStore.set(cookie.name, cookie.value, cookie);

    return apiSuccess({
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  } catch (error) {
    console.error("POST /api/customer/login error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Login failed", 500);
  }
}
