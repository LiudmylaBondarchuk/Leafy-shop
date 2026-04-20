import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory, productVariants } from "@/lib/db/schema-pg";
import { and, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Expires PayPal pending_payment orders older than PENDING_TTL_MINUTES and restores reserved stock.
// Scheduled via vercel.json crons.
const PENDING_TTL_MINUTES = 30;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.CRON_SECRET;
    if (!expectedToken) {
      console.error("[CRON] CRON_SECRET env var not set");
      return apiError("Server configuration error", 500);
    }

    if (token !== expectedToken) {
      return apiError("Invalid cron token", 401, "UNAUTHORIZED");
    }

    const cutoff = new Date(Date.now() - PENDING_TTL_MINUTES * 60 * 1000).toISOString();

    const stale = await db
      .select({ id: orders.id, orderNumber: orders.orderNumber })
      .from(orders)
      .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)));

    let expired = 0;
    for (const s of stale) {
      const updated = await db
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date().toISOString() })
        .where(and(eq(orders.id, s.id), eq(orders.status, "pending_payment")))
        .returning({ id: orders.id });

      if (updated.length === 0) continue; // transitioned elsewhere between select and update

      await db.insert(orderStatusHistory).values({
        orderId: s.id,
        fromStatus: "pending_payment",
        toStatus: "cancelled",
        changedBy: "system",
        note: `Auto-expired: no PayPal capture within ${PENDING_TTL_MINUTES} minutes`,
      });

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, s.id));
      for (const item of items) {
        await db.update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      }

      expired += 1;
    }

    if (expired > 0) revalidatePath("/", "layout");
    console.log(`[CRON] Expired ${expired} pending PayPal order(s)`);
    return apiSuccess({ expired });
  } catch (error) {
    console.error("[CRON] cleanup-pending-paypal error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Cleanup failed", 500);
  }
}
