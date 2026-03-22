import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`check-email:${ip}`, 10, 60000);
    if (!success) return apiError("Too many requests. Please try again later.", 429);

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return apiError("Email is required", 400, "VALIDATION_ERROR");
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.email, email.trim().toLowerCase()),
    });

    return apiSuccess({ hasAccount: !!customer });
  } catch (error) {
    console.error("POST /api/customer/check-email error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to check email", 500);
  }
}
