import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory } from "@/lib/db/schema-pg";
import { eq, and, like } from "drizzle-orm";
import { canTransition } from "@/lib/order-state-machine";
import type { OrderStatus } from "@/constants/order-statuses";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`order-status:${ip}`, 20, 15 * 60 * 1000);
    if (!success) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const number = request.nextUrl.searchParams.get("number");
    const email = request.nextUrl.searchParams.get("email");

    if (!number || !email) {
      return apiError("Order number and email are required", 400, "VALIDATION_ERROR");
    }

    const trimmedNumber = number.trim();
    const normalizedEmail = email.trim().toLowerCase();
    // Accept both full numbers (with access suffix) and base numbers (3 segments).
    // Base form lets users type what they see in emails/invoices while the full
    // form in shared links bypasses enumeration.
    const isBaseForm = trimmedNumber.split("-").length === 3;

    const order = await db.query.orders.findFirst({
      where: and(
        isBaseForm
          ? like(orders.orderNumber, `${trimmedNumber}-%`)
          : eq(orders.orderNumber, trimmedNumber),
        eq(orders.customerEmail, normalizedEmail)
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

    // Check if can cancel (only new or paid, but NOT if already delivered)
    const wasDelivered = order.statusHistory.some((h: any) => h.toStatus === "delivered");
    const canCancel = ["new", "paid"].includes(order.status) && !wasDelivered;

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
      trackingNumber: order.trackingNumber || null,
      canCancel,
      canReturn,
      orderId: order.id,
      wantsInvoice: order.wantsInvoice,
      isPaid: order.statusHistory.some((h: any) => h.toStatus === "paid"),
    });
  } catch (error) {
    console.error("GET /api/orders/status error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch order status", 500);
  }
}
