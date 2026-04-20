import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema-pg";

export type AuditChangeValue = string | number | boolean | null | undefined;
export type AuditChanges = Record<string, { old: AuditChangeValue; new: AuditChangeValue }>;

interface AuditLogEntry {
  userId: number;
  userName: string;
  userRole: string;
  action: "create" | "update" | "delete" | "status_change";
  entityType: "product" | "order" | "discount" | "user";
  entityId?: number;
  entityName?: string;
  changes?: AuditChanges;
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
    console.error("[AUDIT] Failed to log:", error instanceof Error ? error.message : "Unknown error");
  }
}

interface SystemEventEntry {
  action: string;
  entityType: "order" | "product" | "email" | "payment";
  entityId?: number;
  entityName?: string;
  details?: Record<string, unknown>;
}

export async function logSystemEvent(entry: SystemEventEntry) {
  try {
    await db.insert(auditLogs).values({
      userId: null,
      userName: "system",
      userRole: "system",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      entityName: entry.entityName || null,
      changes: entry.details ? JSON.stringify(entry.details) : null,
      isTestData: false,
    });
  } catch (error) {
    console.error("[AUDIT] Failed to log system event:", error instanceof Error ? error.message : "Unknown error");
  }
}

export function detectChanges(
  oldObj: Record<string, AuditChangeValue>,
  newObj: Record<string, AuditChangeValue>,
  fields: string[]
): AuditChanges | undefined {
  const changes: AuditChanges = {};

  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (oldVal !== newVal && newVal !== undefined) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
