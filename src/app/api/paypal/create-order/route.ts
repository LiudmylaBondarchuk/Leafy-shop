import { createPayPalOrder } from "@/lib/paypal";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { totalInCents, orderNumber } = await request.json();

    if (!totalInCents || !orderNumber) {
      return apiError("Total and order number are required", 400);
    }

    // Server-side validation: look up the order and verify the total
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    if (!order) {
      return apiError("Order not found", 404);
    }

    if (order.total !== totalInCents) {
      return apiError("Total mismatch. Payment rejected.", 400);
    }

    const paypalOrder = await createPayPalOrder(totalInCents, orderNumber);

    if (paypalOrder.id) {
      return apiSuccess({ paypalOrderId: paypalOrder.id });
    } else {
      console.error("PayPal create order error:", paypalOrder?.message || "Unknown error");
      return apiError("Failed to create PayPal order", 500);
    }
  } catch (error) {
    console.error("PayPal create order error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to create PayPal order", 500);
  }
}
