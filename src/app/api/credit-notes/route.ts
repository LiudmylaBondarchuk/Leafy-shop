import { db } from "@/lib/db";
import { creditNotes, orders } from "@/lib/db/schema-pg";
import { eq, and, inArray } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { getAdminFromCookie } from "@/lib/auth";
import { generateCreditNote } from "@/lib/credit-notes";

export async function GET() {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) return apiError("Unauthorized", 401);

    // Backfill: generate credit notes for cancelled/returned orders with invoices
    // that don't have a credit note yet
    const cancelledInvoiceOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.wantsInvoice, true),
        inArray(orders.status, ["cancelled", "returned"]),
      ),
      columns: { id: true },
    });

    const existingCNs = await db.select({ orderId: creditNotes.orderId }).from(creditNotes);
    const existingOrderIds = new Set(existingCNs.map((cn: any) => cn.orderId));

    const missingOrders = cancelledInvoiceOrders.filter((o: any) => !existingOrderIds.has(o.id));
    for (const o of missingOrders) {
      await generateCreditNote(o.id, "Order cancelled (backfill)");
    }

    const allCreditNotes = await db.select().from(creditNotes);

    return apiSuccess({ creditNotes: allCreditNotes });
  } catch (error) {
    console.error("GET /api/credit-notes error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch credit notes", 500);
  }
}
