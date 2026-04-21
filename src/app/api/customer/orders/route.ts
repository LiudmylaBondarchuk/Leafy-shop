import { db } from "@/lib/db";
import { orders, customers } from "@/lib/db/schema-pg";
import { eq, desc, or, sql } from "drizzle-orm";
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

  // Match either the explicit customerId link (set for orders placed while logged in)
  // or the email (fallback for guest orders placed before account creation).
  // Email compared case-insensitively to survive legacy rows or vendor-side casing drift.
  const normalizedEmail = customer.email.trim().toLowerCase();
  const customerOrders = await db.query.orders.findMany({
    where: or(
      eq(orders.customerId, customer.id),
      sql`lower(${orders.customerEmail}) = ${normalizedEmail}`
    ),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: true,
    },
  });

  // Exclude internalNotes from customer-facing response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sanitizedOrders = customerOrders.map(({ internalNotes: _notes, ...rest }: any) => rest);

  return apiSuccess({ orders: sanitizedOrders });
}
