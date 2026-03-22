import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { eq, desc } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const payload = await getCustomerFromCookie();
  if (!payload) {
    return apiError("Not authenticated", 401, "UNAUTHORIZED");
  }

  const customerOrders = await db.query.orders.findMany({
    where: eq(orders.customerEmail, payload.email),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: true,
    },
  });

  return apiSuccess({ orders: customerOrders });
}
