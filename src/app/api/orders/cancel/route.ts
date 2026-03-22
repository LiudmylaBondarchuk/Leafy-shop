import { db } from "@/lib/db";
import { orders, orderStatusHistory, productVariants, discountCodes } from "@/lib/db/schema-pg";
import { eq, and, sql } from "drizzle-orm";
import { canTransition } from "@/lib/order-state-machine";
import type { OrderStatus } from "@/constants/order-statuses";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendOrderStatusEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { orderNumber, email } = await request.json();

    if (!orderNumber || !email) {
      return apiError("Order number and email are required", 400);
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderNumber, orderNumber.trim()),
        eq(orders.customerEmail, email.trim().toLowerCase())
      ),
      with: { items: true, statusHistory: true },
    });

    if (!order) {
      return apiError("Order not found", 404, "NOT_FOUND");
    }

    // Only allow cancellation from new or paid, and not if already delivered
    const wasDelivered = (order.statusHistory as any[]).some((h: any) => h.toStatus === "delivered");
    if (!["new", "paid"].includes(order.status) || wasDelivered) {
      return apiError("This order can no longer be cancelled", 422, "CANNOT_CANCEL");
    }

    // Restore stock
    for (const item of order.items as any[]) {
      await db.update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }

    // Revert discount code usage
    if (order.discountCodeId) {
      await db.update(discountCodes)
        .set({ usageCount: sql`${discountCodes.usageCount} - 1` })
        .where(eq(discountCodes.id, order.discountCodeId));
    }

    // Update status
    await db.update(orders)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(orders.id, order.id));

    // Insert history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "cancelled",
      changedBy: "customer",
      note: "Cancelled by customer",
    });

    // Send email
    sendOrderStatusEmail(
      order.customerEmail,
      order.customerFirstName,
      order.orderNumber,
      "cancelled",
      order.shippingMethod,
      order.paymentMethod,
      "Cancelled by customer",
      "customer",
    ).catch(() => {});

    return apiSuccess({ orderNumber: order.orderNumber, status: "cancelled" });
  } catch (error) {
    console.error("POST /api/orders/cancel error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to cancel order", 500);
  }
}
