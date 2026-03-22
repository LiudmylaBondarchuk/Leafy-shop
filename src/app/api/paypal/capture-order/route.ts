import { capturePayPalOrder } from "@/lib/paypal";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { paypalOrderId, orderNumber, email } = await request.json();

    if (!paypalOrderId || !orderNumber) {
      return apiError("PayPal order ID and order number are required", 400);
    }

    // Verify order exists and belongs to the requesting customer
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

    if (captureData.status === "COMPLETED") {
      await db.update(orders)
        .set({ status: "paid", updatedAt: new Date().toISOString() })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        fromStatus: "new",
        toStatus: "paid",
        changedBy: "paypal",
        note: `PayPal payment captured. Transaction ID: ${captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId}`,
      });

      return apiSuccess({
        status: "COMPLETED",
        transactionId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      });
    } else {
      console.error("PayPal capture failed:", captureData?.message || "Unknown error");
      return apiError("Payment was not completed", 400, "PAYMENT_FAILED");
    }
  } catch (error) {
    console.error("PayPal capture error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to capture payment", 500);
  }
}
