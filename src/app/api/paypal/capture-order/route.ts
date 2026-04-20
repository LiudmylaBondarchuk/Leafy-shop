import { capturePayPalOrder } from "@/lib/paypal";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema-pg";
import { and, eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const { paypalOrderId, orderNumber, email } = await request.json();

    if (typeof paypalOrderId !== "string" || typeof orderNumber !== "string" || !paypalOrderId || !orderNumber) {
      return apiError("PayPal order ID and order number are required", 400);
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    if (!order) {
      return apiError("Order not found", 404);
    }

    if (email && order.customerEmail !== email.trim().toLowerCase()) {
      return apiError("Order does not belong to this customer", 403);
    }

    if (order.status !== "new") {
      return apiError("Order has already been processed", 400);
    }

    const captureData = await capturePayPalOrder(paypalOrderId);

    if (captureData?.status !== "COMPLETED") {
      console.error(`[PAYPAL] Capture not completed for order ${orderNumber}: ${captureData?.status} — ${captureData?.message || "no message"}`);
      return apiError("Payment was not completed", 400, "PAYMENT_FAILED");
    }

    const purchaseUnit = captureData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (purchaseUnit?.reference_id !== orderNumber) {
      console.error(`[PAYPAL] reference_id mismatch for order ${orderNumber}: got ${purchaseUnit?.reference_id}`);
      return apiError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    const capturedAmount = capture?.amount;
    const expectedValue = (order.total / 100).toFixed(2);
    if (!capturedAmount || capturedAmount.currency_code !== "EUR" || capturedAmount.value !== expectedValue) {
      console.error(`[PAYPAL] Amount/currency mismatch for order ${orderNumber}: expected ${expectedValue} EUR, got ${capturedAmount?.value} ${capturedAmount?.currency_code}`);
      return apiError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    if (capture?.status !== "COMPLETED") {
      console.error(`[PAYPAL] Capture status not COMPLETED for order ${orderNumber}: ${capture?.status}`);
      return apiError("Payment was not completed", 400, "PAYMENT_FAILED");
    }

    // Atomic transition new → paid; prevents double-processing under concurrent callbacks
    const updated = await db.update(orders)
      .set({ status: "paid", updatedAt: new Date().toISOString() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "new")))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      console.warn(`[PAYPAL] Order ${orderNumber} already transitioned (concurrent capture). Treating as idempotent success.`);
      return apiSuccess({
        status: "COMPLETED",
        transactionId: capture.id,
        idempotent: true,
      });
    }

    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: "new",
      toStatus: "paid",
      changedBy: "paypal",
      note: `PayPal payment captured. Transaction ID: ${capture.id}`,
    });

    revalidatePath("/", "layout");
    return apiSuccess({
      status: "COMPLETED",
      transactionId: capture.id,
    });
  } catch (error) {
    console.error("PayPal capture error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to capture payment", 500);
  }
}
