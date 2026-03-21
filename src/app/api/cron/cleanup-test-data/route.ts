import { db } from "@/lib/db";
import { products, productVariants, orders, orderItems, orderStatusHistory, discountCodes, auditLogs } from "@/lib/db/schema-pg";
import { eq, and, sql } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

// This endpoint is called by an external cron service (e.g., Vercel Cron, GitHub Actions)
// Protected by a secret token in the query string

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.CRON_SECRET || "leafy-cron-secret-token";

    if (token !== expectedToken) {
      return apiError("Invalid cron token", 401, "UNAUTHORIZED");
    }

    const now = new Date().toISOString();
    let cleanedProducts = 0;
    let cleanedDiscounts = 0;
    let cleanedOrders = 0;
    let cleanedLogs = 0;

    // 1. Delete test products and their variants
    const testProducts = await db.select({ id: products.id }).from(products).where(eq(products.isTestData, true));
    for (const p of testProducts) {
      await db.delete(productVariants).where(eq(productVariants.productId, p.id));
      await db.delete(products).where(eq(products.id, p.id));
      cleanedProducts++;
    }

    // 2. Delete test discounts
    const testDiscounts = await db.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.isTestData, true));
    for (const d of testDiscounts) {
      await db.delete(discountCodes).where(eq(discountCodes.id, d.id));
      cleanedDiscounts++;
    }

    // 3. Delete test orders and related data
    const testOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.isTestData, true));
    for (const o of testOrders) {
      await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
      await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
      await db.delete(orders).where(eq(orders.id, o.id));
      cleanedOrders++;
    }

    // 4. Restore soft-deleted products/discounts that were deleted by testers
    // (deleted_at set, is_test_data false but modified by tester via audit log)
    // For now, we only clean test data. Restoring tester modifications would require
    // reading audit_logs and reverting changes — this is a future enhancement.

    // 5. Clean old audit logs (older than 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oldLogs = await db.select({ id: auditLogs.id }).from(auditLogs)
      .where(and(eq(auditLogs.isTestData, true), sql`${auditLogs.createdAt} < ${weekAgo}`));
    for (const l of oldLogs) {
      await db.delete(auditLogs).where(eq(auditLogs.id, l.id));
      cleanedLogs++;
    }

    const summary = {
      cleanedAt: now,
      products: cleanedProducts,
      discounts: cleanedDiscounts,
      orders: cleanedOrders,
      auditLogs: cleanedLogs,
    };

    console.log("[CRON] Test data cleanup:", summary);

    return apiSuccess(summary);
  } catch (error) {
    console.error("[CRON] Cleanup error:", error);
    return apiError("Cleanup failed", 500);
  }
}
