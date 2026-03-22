import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PUT(request: Request) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return apiError("Not authenticated", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const { firstName, lastName, phone, shippingStreet, shippingCity, shippingZip, shippingCountry } = body;

    const updates: Record<string, string | null> = {
      updatedAt: new Date().toISOString(),
    };

    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (shippingStreet !== undefined) updates.shippingStreet = shippingStreet?.trim() || null;
    if (shippingCity !== undefined) updates.shippingCity = shippingCity?.trim() || null;
    if (shippingZip !== undefined) updates.shippingZip = shippingZip?.trim() || null;
    if (shippingCountry !== undefined) updates.shippingCountry = shippingCountry?.trim() || null;

    const [updated] = await db.update(customers).set(updates).where(eq(customers.id, Number(payload.sub))).returning();

    return apiSuccess({
      customer: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        shippingStreet: updated.shippingStreet,
        shippingCity: updated.shippingCity,
        shippingZip: updated.shippingZip,
        shippingCountry: updated.shippingCountry,
      },
    });
  } catch (error) {
    console.error("PUT /api/customer/profile error:", error);
    return apiError("Failed to update profile", 500);
  }
}
