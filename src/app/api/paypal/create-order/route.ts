import { createPayPalOrder } from "@/lib/paypal";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`paypal-create:${ip}`, 5, 60000);
    if (!success) {
      return apiError("Too many requests", 429);
    }

    const { orderNumber } = await request.json();

    if (typeof orderNumber !== "string" || !orderNumber) {
      return apiError("Order number is required", 400);
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    if (!order) {
      return apiError("Order not found", 404);
    }

    // Only orders created in the PayPal flow (awaiting capture) may initiate a PayPal session
    if (order.status !== "pending_payment") {
      return apiError("Order cannot be paid in this state", 400, "INVALID_STATE");
    }

    if (order.paymentMethod !== "paypal") {
      return apiError("Order is not set for PayPal payment", 400, "INVALID_PAYMENT_METHOD");
    }

    const paypalOrder = await createPayPalOrder(order.total, orderNumber);

    if (paypalOrder.id) {
      return apiSuccess({ paypalOrderId: paypalOrder.id });
    }

    console.error("PayPal create order error:", paypalOrder?.message || "Unknown error");
    return apiError("Failed to create PayPal order", 500);
  } catch (error) {
    console.error("PayPal create order error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to create PayPal order", 500);
  }
}
