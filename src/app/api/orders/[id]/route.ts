import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import type { OrderStatus } from "@/constants/order-statuses";
import { getTransitionsForOrder } from "@/constants/order-statuses";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(id)),
      with: {
        items: true,
        statusHistory: {
          orderBy: (h: any, { asc }: any) => [asc(h.createdAt)],
        },
        discountCode: true,
      },
    });

    if (!order) {
      return apiError("Order not found", 404, "NOT_FOUND");
    }

    const availableTransitions = getTransitionsForOrder(order.status as OrderStatus, order.paymentMethod);

    return apiSuccess({ ...order, availableTransitions });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return apiError("Failed to fetch order", 500);
  }
}
