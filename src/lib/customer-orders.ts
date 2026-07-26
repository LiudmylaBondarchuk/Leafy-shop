import { orders } from "@/lib/db/schema-pg";
import { or, eq, sql } from "drizzle-orm";

// Single source of truth: which orders belong to a customer account.
// An order belongs if it was placed while logged in (customerId link) OR its
// snapshot email matches (case-insensitive — covers guest orders and the case
// where the customer later changed their account email). Admin and customer
// views MUST use this same rule, otherwise order counts and access checks drift
// the moment a customer edits their email.

export function orderBelongsToCustomer(
  order: { customerId: number | null; customerEmail: string },
  account: { id: number; email: string },
): boolean {
  return (
    order.customerId === account.id ||
    order.customerEmail.trim().toLowerCase() === account.email.trim().toLowerCase()
  );
}

// Drizzle WHERE form of the same rule, for DB-level filtering.
export function customerOrdersWhere(account: { id: number; email: string }) {
  return or(
    eq(orders.customerId, account.id),
    sql`lower(${orders.customerEmail}) = ${account.email.trim().toLowerCase()}`,
  );
}
