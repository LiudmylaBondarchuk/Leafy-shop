import { db } from "@/lib/db";
import { orders, orderStatusHistory, productVariants, orderItems, discountCodes } from "@/lib/db/schema-pg";
import { eq, sql } from "drizzle-orm";
import { canTransition, transition } from "@/lib/order-state-machine";
import type { OrderStatus } from "@/constants/order-statuses";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendOrderStatusEmail } from "@/lib/email";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, note } = body;

    if (!newStatus) {
      return apiError("Status is required", 400, "VALIDATION_ERROR");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(id)),
      with: { items: true },
    });

    if (!order) {
      return apiError("Order not found", 404, "NOT_FOUND");
    }

    const currentStatus = order.status as OrderStatus;

    try {
      transition(currentStatus, newStatus as OrderStatus);
    } catch {
      return apiError(
        `Cannot change status from "${currentStatus}" to "${newStatus}".`,
        422,
        "INVALID_TRANSITION"
      );
    }

    // Side effects for cancellation/return: restore stock
    if (newStatus === "cancelled" || newStatus === "returned") {
      for (const item of order.items) {
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
    }

    // Update order status
    await db.update(orders)
      .set({ status: newStatus, updatedAt: new Date().toISOString() })
      .where(eq(orders.id, parseInt(id)));

    // Insert status history
    await db.insert(orderStatusHistory)
      .values({
        orderId: parseInt(id),
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedBy: "admin",
        note: note || null,
      });

    // Send status update email (async)
    sendOrderStatusEmail(
      order.customerEmail,
      order.customerFirstName,
      order.orderNumber,
      newStatus,
      order.shippingMethod,
      note
    ).catch(() => {});

    return apiSuccess({ orderNumber: order.orderNumber, status: newStatus });
  } catch (error) {
    console.error("PATCH /api/orders/[id]/status error:", error);
    return apiError("Failed to update order status", 500);
  }
}
