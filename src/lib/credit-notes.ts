import { db } from "@/lib/db";
import { creditNotes, orders } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

function generateInvoiceNumber(orderId: number, date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `INV/${year}/${month}/${String(orderId).padStart(4, "0")}`;
}

function generateCreditNoteNumber(orderId: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `CN/${year}/${month}/${String(orderId).padStart(4, "0")}`;
}

/**
 * Generates a credit note for a cancelled order that had an invoice.
 * Returns the credit note record or null if no credit note was needed.
 */
export async function generateCreditNote(orderId: number, reason?: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });

  if (!order) return null;
  if (!order.wantsInvoice) return null;

  // Check if a credit note already exists for this order
  const existing = await db.query.creditNotes.findFirst({
    where: eq(creditNotes.orderId, orderId),
  });
  if (existing) return existing;

  const cfg = await getSettings();
  const vatRate = (order as any).vatRate ?? parseInt(cfg["store.vat_rate"] || "23", 10);
  const vatAmount = (order as any).vatAmount ?? 0;

  const originalInvoiceNumber = generateInvoiceNumber(order.id, order.createdAt);
  const creditNoteNumber = generateCreditNoteNumber(order.id);

  const [creditNote] = await db.insert(creditNotes).values({
    creditNoteNumber,
    orderId: order.id,
    originalInvoiceNumber,
    reason: reason || "Order cancelled",
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingCost: order.shippingCost,
    vatRate,
    vatAmount,
    total: order.total,
    customerEmail: order.customerEmail,
    emailSent: false,
  }).returning();

  return creditNote;
}

/**
 * Get credit note by order ID
 */
export async function getCreditNoteByOrderId(orderId: number) {
  return db.query.creditNotes.findFirst({
    where: eq(creditNotes.orderId, orderId),
  });
}

/**
 * Get all credit notes
 */
export async function getAllCreditNotes() {
  return db.select().from(creditNotes);
}

/**
 * Mark credit note email as sent
 */
export async function markCreditNoteEmailSent(creditNoteId: number) {
  await db.update(creditNotes)
    .set({ emailSent: true })
    .where(eq(creditNotes.id, creditNoteId));
}
