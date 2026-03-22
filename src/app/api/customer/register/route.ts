import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq, and, ne } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { signCustomerToken, createCustomerCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`customer-register:${ip}`, 5, 60000);
    if (!success) return apiError("Too many requests. Please try again later.", 429);

    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    if (!email || !email.trim()) {
      return apiError("Email is required", 400, "VALIDATION_ERROR");
    }
    if (!password || password.length < 8) {
      return apiError("Password must be at least 8 characters", 400, "VALIDATION_ERROR");
    }
    if (!firstName || !lastName) {
      return apiError("First name and last name are required", 400, "VALIDATION_ERROR");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.query.customers.findFirst({
      where: eq(customers.email, normalizedEmail),
    });
    if (existing) {
      return apiError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }

    if (phone && phone.trim()) {
      const phoneConflict = await db.query.customers.findFirst({
        where: and(
          eq(customers.phone, phone.trim()),
          ne(customers.email, normalizedEmail)
        ),
      });
      if (phoneConflict) {
        return apiError("This phone number is already linked to another account", 409, "PHONE_CONFLICT");
      }
    }

    const passwordHash = hashSync(password, 10);

    const [customer] = await db.insert(customers).values({
      email: normalizedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
    }).returning();

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
    }, 201);
  } catch (error) {
    console.error("POST /api/customer/register error:", error);
    return apiError("Registration failed", 500);
  }
}
