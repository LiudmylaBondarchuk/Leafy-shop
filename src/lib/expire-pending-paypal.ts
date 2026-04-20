import { db } from "./db";
import { orders, orderItems, orderStatusHistory, productVariants } from "./db/schema-pg";
import { and, eq, lt, sql } from "drizzle-orm";

export const PENDING_PAYPAL_TTL_MINUTES = 30;

// Opportunistically expires PayPal pending_payment orders past TTL and restores reserved stock.
// Called at the start of order-related endpoints so low-traffic shops still get cleanup
// without requiring a sub-daily cron. Idempotent and safe under concurrent calls.
export async function expireStalePendingOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_PAYPAL_TTL_MINUTES * 60 * 1000).toISOString();

  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)));

  let expired = 0;
  for (const s of stale) {
    const updated = await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(and(eq(orders.id, s.id), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });

    if (updated.length === 0) continue; // transitioned concurrently elsewhere

    await db.insert(orderStatusHistory).values({
      orderId: s.id,
      fromStatus: "pending_payment",
      toStatus: "cancelled",
      changedBy: "system",
      note: `Auto-expired: no PayPal capture within ${PENDING_PAYPAL_TTL_MINUTES} minutes`,
    });

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, s.id));
    for (const item of items) {
      await db.update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }

    expired += 1;
  }
  return expired;
}

// Returns true if the order is too old to accept a PayPal capture.
export function isPendingOrderExpired(createdAt: string): boolean {
  const cutoff = Date.now() - PENDING_PAYPAL_TTL_MINUTES * 60 * 1000;
  return new Date(createdAt).getTime() < cutoff;
}
