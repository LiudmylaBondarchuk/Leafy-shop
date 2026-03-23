import { db } from "@/lib/db";
import { orders, orderStatusHistory, productVariants, orderItems, discountCodes, products, adminUsers } from "@/lib/db/schema-pg";
import { eq, sql, inArray } from "drizzle-orm";
import type { OrderStatus } from "@/constants/order-statuses";
import { getTransitionsForOrder } from "@/constants/order-statuses";
import { logAudit } from "@/lib/audit";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendOrderStatusEmail, sendCreditNoteEmail } from "@/lib/email";
import { getAdminFromCookie } from "@/lib/auth";
import { generateCreditNote, markCreditNoteEmailSent } from "@/lib/credit-notes";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromCookie();
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, note, trackingNumber } = body;

    if (!newStatus) {
      return apiError("Status is required", 400, "VALIDATION_ERROR");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(id)),
      with: { items: true },
    });

    if (!order) {
      return apiError("Order not found", 404, "NOT_FOUND");
    }

    const currentStatus = order.status as OrderStatus;

    // Fetch admin user info early (needed for changedBy and audit)
    const adminUserId = admin ? Number(admin.sub) : 0;
    const requestingUser = adminUserId ? await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, adminUserId),
    }) : null;

    const allowedTransitions = getTransitionsForOrder(currentStatus, order.paymentMethod);
    if (!allowedTransitions.includes(newStatus as OrderStatus)) {
      return apiError(
        `Cannot change status from "${currentStatus}" to "${newStatus}".`,
        422,
        "INVALID_TRANSITION"
      );
    }

    // Side effects for cancellation/return: restore stock
    if (newStatus === "cancelled" || newStatus === "returned") {
      for (const item of order.items) {
        await db.update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId));
      }

      // Revert discount code usage
      if (order.discountCodeId) {
        await db.update(discountCodes)
          .set({ usageCount: sql`${discountCodes.usageCount} - 1` })
          .where(eq(discountCodes.id, order.discountCodeId));
      }
    }

    // Update order status (and tracking number if shipping)
    const updateData: Record<string, any> = { status: newStatus, updatedAt: new Date().toISOString() };
    if (newStatus === "shipped" && trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, parseInt(id)));

    // Insert status history
    await db.insert(orderStatusHistory)
      .values({
        orderId: parseInt(id),
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedBy: admin ? `admin:${admin.sub}:${requestingUser?.name || "Unknown"}` : "admin",
        note: note || null,
      });

    // Get product types for email personalization
    const productIds = (order.items as any[]).map((i: any) => i.productId);
    let productTypes: string[] = [];
    if (productIds.length > 0) {
      const prods = await db.select({ productType: products.productType })
        .from(products)
        .where(inArray(products.id, productIds));
      productTypes = [...new Set(prods.map((p: any) => p.productType))] as string[];
    }

    // Send status update email (async)
    sendOrderStatusEmail(
      order.customerEmail,
      order.customerFirstName,
      order.orderNumber,
      newStatus,
      order.shippingMethod,
      order.paymentMethod,
      note,
      "admin",
      productTypes,
      newStatus === "shipped" ? trackingNumber : undefined,
    ).catch(() => {});

    // Generate credit note for cancelled orders with invoices
    if (newStatus === "cancelled" && order.wantsInvoice) {
      try {
        const creditNote = await generateCreditNote(order.id, note || "Order cancelled");
        if (creditNote) {
          sendCreditNoteEmail(
            order.customerEmail,
            order.customerFirstName,
            order.orderNumber,
            creditNote.creditNoteNumber,
            creditNote.originalInvoiceNumber,
            creditNote.total,
            order.id,
          ).then(() => markCreditNoteEmailSent(creditNote.id)).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to generate credit note:", err instanceof Error ? err.message : "Unknown error");
      }
    }

    // Audit log
    logAudit({
      userId: adminUserId,
      userName: requestingUser?.name || "Unknown",
      userRole: requestingUser?.role || "unknown",
      action: "status_change",
      entityType: "order",
      entityId: parseInt(id),
      entityName: order.orderNumber,
      changes: { status: { old: currentStatus, new: newStatus } },
    });

    return apiSuccess({ orderNumber: order.orderNumber, status: newStatus });
  } catch (error) {
    console.error("PATCH /api/orders/[id]/status error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to update order status", 500);
  }
}
