import { db } from "@/lib/db";
import { orders, customers } from "@/lib/db/schema-pg";
import { eq, desc } from "drizzle-orm";
import { getCustomerFromCookie } from "@/lib/customer-auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const payload = await getCustomerFromCookie();
  if (!payload) {
    return apiError("Not authenticated", 401, "UNAUTHORIZED");
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, Number(payload.sub)),
  });

  if (!customer) {
    return apiError("Customer not found", 404, "NOT_FOUND");
  }

  const customerOrders = await db.query.orders.findMany({
    where: eq(orders.customerEmail, customer.email),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: true,
    },
  });

  return apiSuccess({ orders: customerOrders });
}
