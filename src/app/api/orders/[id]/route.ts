import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import type { OrderStatus } from "@/constants/order-statuses";
import { getTransitionsForOrder } from "@/constants/order-statuses";
import { apiSuccess, apiError } from "@/lib/utils";
import { getAdminFromCookie } from "@/lib/auth";
import { NextRequest } from "next/server";

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
    console.error("GET /api/orders/[id] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch order", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    const body = await request.json();
    const { internalNotes } = body;

    if (typeof internalNotes !== "string") {
      return apiError("internalNotes must be a string", 400, "VALIDATION_ERROR");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(id)),
    });

    if (!order) {
      return apiError("Order not found", 404, "NOT_FOUND");
    }

    await db.update(orders)
      .set({ internalNotes, updatedAt: new Date().toISOString() })
      .where(eq(orders.id, parseInt(id)));

    return apiSuccess({ id: parseInt(id), internalNotes });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to update order", 500);
  }
}
