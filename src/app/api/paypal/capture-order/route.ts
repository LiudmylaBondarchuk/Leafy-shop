import { capturePayPalOrder } from "@/lib/paypal";
import { db } from "@/lib/db";
import { orders, orderStatusHistory, discountCodes } from "@/lib/db/schema-pg";
import { and, eq, sql } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const { paypalOrderId, orderNumber } = await request.json();

    if (typeof paypalOrderId !== "string" || typeof orderNumber !== "string" || !paypalOrderId || !orderNumber) {
      return apiError("PayPal order ID and order number are required", 400);
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    if (!order) {
      return apiError("Order not found", 404);
    }

    // Idempotency: if already paid, treat as success (handles retry after network glitch/double-click)
    if (order.status === "paid") {
      return apiSuccess({ status: "COMPLETED", idempotent: true });
    }

    if (order.status !== "pending_payment") {
      return apiError("Order cannot be captured in this state", 400, "INVALID_STATE");
    }

    const captureData = await capturePayPalOrder(paypalOrderId);

    if (captureData?.status !== "COMPLETED") {
      console.error(`[PAYPAL] Capture not completed for order ${orderNumber}: ${captureData?.status} — ${captureData?.message || "no message"}`);
      await autoCancel(order.id, orderNumber, `PayPal capture failed: ${captureData?.status || "unknown"}`);
      return apiError("Payment was not completed", 400, "PAYMENT_FAILED");
    }

    const purchaseUnit = captureData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (purchaseUnit?.reference_id !== orderNumber) {
      console.error(`[PAYPAL] reference_id mismatch for order ${orderNumber}: got ${purchaseUnit?.reference_id}`);
      await autoCancel(order.id, orderNumber, "PayPal reference_id mismatch");
      return apiError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    const capturedAmount = capture?.amount;
    const expectedValue = (order.total / 100).toFixed(2);
    if (!capturedAmount || capturedAmount.currency_code !== "EUR" || capturedAmount.value !== expectedValue) {
      console.error(`[PAYPAL] Amount/currency mismatch for order ${orderNumber}: expected ${expectedValue} EUR, got ${capturedAmount?.value} ${capturedAmount?.currency_code}`);
      await autoCancel(order.id, orderNumber, "PayPal amount mismatch");
      return apiError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    // Payer email must match order customer email (blocks IDOR where attacker pays for victim's order via chargeback-rollback)
    const payerEmail = captureData.payer?.email_address?.trim().toLowerCase();
    if (!payerEmail || payerEmail !== order.customerEmail) {
      console.error(`[PAYPAL] Payer email mismatch for order ${orderNumber}: expected ${order.customerEmail}, got ${payerEmail || "missing"}`);
      await autoCancel(order.id, orderNumber, "PayPal payer email mismatch");
      return apiError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    if (capture?.status !== "COMPLETED") {
      console.error(`[PAYPAL] Capture status not COMPLETED for order ${orderNumber}: ${capture?.status}`);
      await autoCancel(order.id, orderNumber, "PayPal capture incomplete");
      return apiError("Payment was not completed", 400, "PAYMENT_FAILED");
    }

    // Atomic transition pending_payment → paid; prevents double-processing under concurrent callbacks
    const updated = await db.update(orders)
      .set({ status: "paid", updatedAt: new Date().toISOString() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      console.warn(`[PAYPAL] Order ${orderNumber} already transitioned (concurrent capture). Treating as idempotent success.`);
      return apiSuccess({ status: "COMPLETED", transactionId: capture.id, idempotent: true });
    }

    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: "pending_payment",
      toStatus: "paid",
      changedBy: "paypal",
      note: `PayPal payment captured. Transaction ID: ${capture.id}`,
    });

    // Increment discount code usage now that payment is confirmed
    if (order.discountCodeId) {
      await db.update(discountCodes)
        .set({ usageCount: sql`${discountCodes.usageCount} + 1` })
        .where(eq(discountCodes.id, order.discountCodeId));
    }

    // Load fresh order data with items for confirmation email
    const cfg = await getSettings();
    const confirmationEnabled = cfg["email.enabled.order_confirmation"] !== "false";
    if (confirmationEnabled) {
      const fullOrder = await db.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: { items: true },
      });
      if (fullOrder) {
        sendOrderConfirmationEmail({
          orderNumber: fullOrder.orderNumber,
          customerName: fullOrder.customerFirstName,
          customerEmail: fullOrder.customerEmail,
          items: (fullOrder.items as Array<{ productName: string; variantDesc: string; quantity: number; totalPrice: number }>).map((i) => ({
            productName: i.productName,
            variantDesc: i.variantDesc,
            quantity: i.quantity,
            totalPrice: i.totalPrice,
          })),
          subtotal: fullOrder.subtotal,
          discountAmount: fullOrder.discountAmount,
          vatRate: fullOrder.vatRate,
          vatAmount: fullOrder.vatAmount,
          shippingCost: fullOrder.shippingCost,
          total: fullOrder.total,
          shippingMethod: fullOrder.shippingMethod,
          paymentMethod: fullOrder.paymentMethod,
          shippingAddress: `${fullOrder.shippingStreet}, ${fullOrder.shippingZip} ${fullOrder.shippingCity}`,
          orderId: fullOrder.id,
          wantsInvoice: fullOrder.wantsInvoice,
        }).catch((err) => console.error("[EMAIL] Order confirmation failed:", err instanceof Error ? err.message : "Unknown error"));
      }
    }

    revalidatePath("/", "layout");
    return apiSuccess({ status: "COMPLETED", transactionId: capture.id });
  } catch (error) {
    console.error("PayPal capture error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to capture payment", 500);
  }
}

// Auto-cancel order and restore stock when PayPal capture fails verification.
async function autoCancel(orderId: number, orderNumber: string, reason: string) {
  try {
    const cancelled = await db.update(orders)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });

    if (cancelled.length === 0) return; // already transitioned elsewhere

    await db.insert(orderStatusHistory).values({
      orderId,
      fromStatus: "pending_payment",
      toStatus: "cancelled",
      changedBy: "system",
      note: `Auto-cancelled: ${reason}`,
    });

    // Restore stock (was reserved at order creation)
    const { orderItems, productVariants } = await import("@/lib/db/schema-pg");
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      await db.update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }
    revalidatePath("/", "layout");
  } catch (err) {
    console.error(`[PAYPAL] autoCancel failed for order ${orderNumber}:`, err instanceof Error ? err.message : "Unknown error");
  }
}
