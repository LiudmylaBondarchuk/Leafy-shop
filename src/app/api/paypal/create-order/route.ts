import { createPayPalOrder } from "@/lib/paypal";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { totalInCents, orderNumber } = await request.json();

    if (!totalInCents || !orderNumber) {
      return apiError("Total and order number are required", 400);
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
