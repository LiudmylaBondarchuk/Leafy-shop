import { db } from "@/lib/db";
import { orders, orderStatusHistory, productVariants, discountCodes } from "@/lib/db/schema-pg";
import { eq, and, sql, like } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { sendOrderStatusEmail, sendCreditNoteEmail } from "@/lib/email";
import { generateCreditNote, markCreditNoteEmailSent } from "@/lib/credit-notes";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { verifyCancelToken } from "@/lib/cancel-token";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const { orderNumber, email, cancelToken } = await request.json();

    if (!orderNumber || !email) {
      return apiError("Order number and email are required", 400);
    }

    const trimmedNumber = orderNumber.trim();
    const isBaseForm = trimmedNumber.split("-").length === 3;
    const order = await db.query.orders.findFirst({
      where: and(
        isBaseForm
          ? like(orders.orderNumber, `${trimmedNumber}-%`)
          : eq(orders.orderNumber, trimmedNumber),
        eq(orders.customerEmail, email.trim().toLowerCase())
      ),
      with: { items: true, statusHistory: true },
    });

    if (!order) {
      return apiError("Order not found", 404, "NOT_FOUND");
    }

    // Rate limit: relaxed for pending_payment (abandon flow), strict for paid cancellations
    const isPendingPayment = order.status === "pending_payment";
    const limit = isPendingPayment
      ? rateLimit(`order-cancel-pending:${ip}`, 20, 60 * 1000)
      : rateLimit(`order-cancel:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.success) return apiError("Too many cancellation attempts. Please try again later.", 429);

    // Ownership guard for pending_payment: require HMAC cancelToken returned from POST /api/orders.
    // Without this, anyone who knows orderNumber + email (both visible on confirmation page URL)
    // could cancel a stranger's pending order and free up reserved stock.
    if (isPendingPayment) {
      if (typeof cancelToken !== "string" || !verifyCancelToken(order.orderNumber, order.customerEmail, cancelToken)) {
        return apiError("Invalid cancellation token", 403, "INVALID_TOKEN");
      }
    }

    // Only allow cancellation from pending_payment, new, or paid; never after delivery
    const wasDelivered = (order.statusHistory as any[]).some((h: any) => h.toStatus === "delivered");
    if (!["pending_payment", "new", "paid"].includes(order.status) || wasDelivered) {
      return apiError("This order can no longer be cancelled", 422, "CANNOT_CANCEL");
    }

    // Restore stock (reserved at creation for both pending_payment and new/paid)
    for (const item of order.items as any[]) {
      await db.update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }

    // Revert discount code usage (only if it was incremented — pending_payment never increments)
    if (order.discountCodeId && !isPendingPayment) {
      await db.update(discountCodes)
        .set({ usageCount: sql`GREATEST(${discountCodes.usageCount} - 1, 0)` })
        .where(eq(discountCodes.id, order.discountCodeId));
    }

    // Update status
    await db.update(orders)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(orders.id, order.id));

    // Insert history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "cancelled",
      changedBy: "customer",
      note: "Cancelled by customer",
    });

    // Send email (if enabled in settings) — skip for pending_payment abandonments (no email was ever sent)
    const cfg = await getSettings();
    const cancelEmailEnabled = cfg["email.enabled.status_cancelled"] !== "false";

    if (cancelEmailEnabled && !isPendingPayment) {
      sendOrderStatusEmail(
        order.customerEmail,
        order.customerFirstName,
        order.orderNumber,
        "cancelled",
        order.shippingMethod,
        order.paymentMethod,
        "Cancelled by customer",
        "customer",
      ).catch(() => {});
    }

    // Generate credit note for orders with invoices (skip pending_payment — no invoice was issued)
    if (order.wantsInvoice && !isPendingPayment) {
      try {
        const creditNote = await generateCreditNote(order.id, "Cancelled by customer");
        if (creditNote && cancelEmailEnabled) {
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

    revalidatePath("/", "layout");
    return apiSuccess({ orderNumber: order.orderNumber, status: "cancelled" });
  } catch (error) {
    console.error("POST /api/orders/cancel error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to cancel order", 500);
  }
}
