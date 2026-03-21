import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory } from "@/lib/db/schema-pg";
import { eq, and } from "drizzle-orm";
import { canTransition } from "@/lib/order-state-machine";
import type { OrderStatus } from "@/constants/order-statuses";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const number = request.nextUrl.searchParams.get("number");
    const email = request.nextUrl.searchParams.get("email");

    if (!number || !email) {
      return apiError("Order number and email are required", 400, "VALIDATION_ERROR");
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderNumber, number.trim()),
        eq(orders.customerEmail, email.trim().toLowerCase())
      ),
      with: {
        items: true,
        statusHistory: {
          orderBy: (h: any, { asc }: any) => [asc(h.createdAt)],
        },
      },
    });

    if (!order) {
      return apiError("Order not found. Please check the order number and email address.", 404, "NOT_FOUND");
    }

    // Check if can cancel
    const canCancel = canTransition(order.status as OrderStatus, "cancelled");

    // Check if can return (delivered + within 14 days)
    let canReturn = false;
    if (order.status === "delivered") {
      const deliveredEntry = order.statusHistory.find((h: any) => h.toStatus === "delivered");
      if (deliveredEntry) {
        const deliveredDate = new Date(deliveredEntry.createdAt);
        const daysSinceDelivery = (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);
        canReturn = daysSinceDelivery <= 14;
      }
    }

    return apiSuccess({
      orderNumber: order.orderNumber,
      status: order.status,
      customerFirstName: order.customerFirstName,
      customerLastName: order.customerLastName,
      items: order.items as any[],
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingCost: order.shippingCost,
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      total: order.total,
      createdAt: order.createdAt,
      history: order.statusHistory.map((h: any) => ({
        status: h.toStatus,
        date: h.createdAt,
        note: h.note,
      })),
      canCancel,
      canReturn,
    });
  } catch (error) {
    console.error("GET /api/orders/status error:", error);
    return apiError("Failed to fetch order status", 500);
  }
}
