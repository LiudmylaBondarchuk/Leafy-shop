import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema-pg";

interface AuditLogEntry {
  userId: number;
  userName: string;
  userRole: string;
  action: "create" | "update" | "delete" | "status_change";
  entityType: "product" | "order" | "discount" | "user";
  entityId?: number;
  entityName?: string;
  changes?: Record<string, { old: any; new: any }>;
  isTestData?: boolean;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      entityName: entry.entityName || null,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      isTestData: entry.isTestData || false,
    });
  } catch (error) {
    console.error("[AUDIT] Failed to log:", error);
  }
}

// Helper to detect changes between old and new objects
export function detectChanges(oldObj: any, newObj: any, fields: string[]): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {};

  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (oldVal !== newVal && newVal !== undefined) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
