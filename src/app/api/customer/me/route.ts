import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const payload = await getCustomerFromCookie();
  if (!payload) {
    return apiSuccess({ customer: null });
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, Number(payload.sub)),
    columns: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      shippingStreet: true,
      shippingCity: true,
      shippingZip: true,
      shippingCountry: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  if (customer?.deletedAt) {
    return apiError("Account deleted", 401);
  }

  return apiSuccess({ customer: customer || null });
}
