import { db } from "@/lib/db";
import { customerAccountLogs } from "@/lib/db/schema-pg";
import { detectChanges, type AuditChanges } from "@/lib/audit";

export { detectChanges };
export type { AuditChanges };

interface CustomerLogEntry {
  customerId: number;
  actorType: "admin" | "customer";
  actorId?: number | null;
  actorName: string;
  actorRole?: string | null;
  action: "update" | "password_reset";
  changes?: AuditChanges;
}

/**
 * Record a change to a customer ACCOUNT. Writes to customer_account_logs only —
 * never audit_logs — so the global Activity Logs feed stays free of customer data.
 */
export async function logCustomerChange(entry: CustomerLogEntry) {
  try {
    await db.insert(customerAccountLogs).values({
      customerId: entry.customerId,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      actorName: entry.actorName,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
    });
  } catch (error) {
    console.error("[CUSTOMER AUDIT] Failed to log:", error instanceof Error ? error.message : "Unknown error");
  }
}
