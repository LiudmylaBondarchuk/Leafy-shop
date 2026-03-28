import { db } from "@/lib/db";
import { products, productVariants, orders, orderItems, orderStatusHistory, discountCodes, auditLogs, adminUsers } from "@/lib/db/schema-pg";
import { eq, and, sql, isNull } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";
import { Resend } from "resend";
import { getSettings } from "@/lib/settings";

// This endpoint is called by an external cron service (e.g., Vercel Cron, GitHub Actions)
// Protected by a secret token in the query string

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.CRON_SECRET;
    if (!expectedToken) {
      console.error("[CRON] CRON_SECRET env var not set");
      return apiError("Server configuration error", 500);
    }

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

    // 3. Revert order status changes made by testers (before deleting test orders)
    const testerUsers = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.role, "tester"));
    const testerIds = testerUsers.map((u: { id: number }) => u.id);
    let revertedStatuses = 0;

    if (testerIds.length > 0) {
      // Find all status history entries made by testers on non-test orders
      const allStatusHistory = await db
        .select({
          id: orderStatusHistory.id,
          orderId: orderStatusHistory.orderId,
          fromStatus: orderStatusHistory.fromStatus,
          toStatus: orderStatusHistory.toStatus,
          changedBy: orderStatusHistory.changedBy,
        })
        .from(orderStatusHistory)
        .innerJoin(orders, eq(orders.id, orderStatusHistory.orderId))
        .where(eq(orders.isTestData, false))
        .orderBy(orderStatusHistory.id);

      // Group by orderId, keep only tester changes
      const testerChanges = new Map<number, { historyIds: number[]; originalStatus: string | null }>();
      for (const h of allStatusHistory) {
        const match = h.changedBy?.match(/^admin:(\d+):/);
        if (match && testerIds.includes(parseInt(match[1]))) {
          if (!testerChanges.has(h.orderId)) {
            testerChanges.set(h.orderId, { historyIds: [], originalStatus: h.fromStatus });
          }
          testerChanges.get(h.orderId)!.historyIds.push(h.id);
        }
      }

      // Revert each order to its original status and remove tester history entries
      for (const [orderId, { historyIds, originalStatus }] of testerChanges) {
        if (originalStatus) {
          await db.update(orders).set({ status: originalStatus, updatedAt: new Date().toISOString() }).where(eq(orders.id, orderId));
        }
        for (const hId of historyIds) {
          await db.delete(orderStatusHistory).where(eq(orderStatusHistory.id, hId));
        }
        revertedStatuses++;
      }
    }

    // 4. Delete test orders (created by testers, isTestData: true)
    const testOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.isTestData, true));
    for (const o of testOrders) {
      await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
      await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
      await db.delete(orders).where(eq(orders.id, o.id));
      cleanedOrders++;
    }

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
      revertedStatuses,
      auditLogs: cleanedLogs,
    };

    console.log("[CRON] Test data cleanup:", summary);

    // ── Low stock alerts ──────────────────────────────────────
    let lowStockCount = 0;
    try {
      const cfg = await getSettings();
      const threshold = parseInt(cfg["alerts.warning_threshold"] || "10", 10);
      const recipients = (cfg["alerts.stock_recipients"] || "")
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);
      const alertFrom = cfg["email.alerts_from"] || "alerts@leafyshop.eu";

      if (recipients.length > 0) {
        const lowStockProducts = await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            totalStock: sql<number>`coalesce(sum(${productVariants.stock}), 0)`.as("total_stock"),
          })
          .from(products)
          .leftJoin(productVariants, eq(productVariants.productId, products.id))
          .where(
            and(
              eq(products.isActive, true),
              isNull(products.deletedAt)
            )
          )
          .groupBy(products.id, products.name, products.slug)
          .having(sql`coalesce(sum(${productVariants.stock}), 0) <= ${threshold}`);

        if (lowStockProducts.length > 0) {
          lowStockCount = lowStockProducts.length;
          await sendLowStockAlert(lowStockProducts, threshold, alertFrom, recipients);

          // Log in audit_logs
          await db.insert(auditLogs).values({
            userName: "system",
            userRole: "cron",
            action: "low_stock_alert",
            entityType: "product",
            entityName: lowStockProducts.map((p: { name: string }) => p.name).join(", "),
            changes: JSON.stringify({ threshold, count: lowStockProducts.length, products: lowStockProducts.map((p: { name: string; totalStock: number }) => ({ name: p.name, stock: p.totalStock })) }),
          });

          console.log(`[CRON] Low stock alert sent for ${lowStockProducts.length} products to ${recipients.join(", ")}`);
        }
      }
    } catch (err) {
      console.error("[CRON] Low stock alert error:", err instanceof Error ? err.message : "Unknown error");
    }

    return apiSuccess({ ...summary, lowStockAlerts: lowStockCount });
  } catch (error) {
    console.error("[CRON] Cleanup error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Cleanup failed", 500);
  }
}

// ── Low stock alert email ──────────────────────────────────
async function sendLowStockAlert(
  items: { id: number; name: string; slug: string; totalStock: number }[],
  threshold: number,
  from: string,
  to: string[]
) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) {
    console.warn("[CRON] Resend not configured, skipping low stock alert email");
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://leafyshop.eu";
  const rows = items
    .map(
      (p) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${p.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:${p.totalStock === 0 ? "#dc2626" : "#d97706"}">${p.totalStock}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${threshold}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb"><a href="${baseUrl}/management/products/${p.id}" style="color:#16a34a">Edit</a></td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#d97706">Low Stock Alert</h2>
      <p>${items.length} product${items.length === 1 ? "" : "s"} ${items.length === 1 ? "is" : "are"} at or below the stock threshold of <strong>${threshold}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Product</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb">Stock</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb">Threshold</th>
            <th style="padding:8px 12px;border-bottom:2px solid #e5e7eb">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:13px">This alert was generated automatically by the Leafy Shop daily cron job.</p>
    </div>`;

  await resend.emails.send({
    from,
    to,
    subject: `Low Stock Alert — ${items.length} product${items.length === 1 ? "" : "s"} below threshold`,
    html,
  });
}
