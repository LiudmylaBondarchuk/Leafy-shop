"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Package, ShoppingBag, Tag, UserCog, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  status_change: "bg-purple-100 text-purple-800",
};

const ENTITY_ICONS: Record<string, any> = {
  product: Package,
  order: ShoppingBag,
  discount: Tag,
  user: UserCog,
};

const ROLE_COLORS: Record<string, string> = {
  admin: "text-red-600",
  manager: "text-blue-600",
  tester: "text-purple-600",
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") {
    try {
      const str = JSON.stringify(val);
      return str.length > 60 ? str.slice(0, 57) + "..." : str;
    } catch {
      return "—";
    }
  }
  return String(val);
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: "", userRole: "", action: "" });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState("");
  const [clearModal, setClearModal] = useState(false);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then((r) => r.json())
      .then((json) => {
        setLogs(json.data || []);
        setLoading(false);
      });
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      if (json.data?.user) setUserRole(json.data.user.role || "");
    });
  }, []);

  const filtered = logs.filter((l) => {
    if (filter.entityType && l.entityType !== filter.entityType) return false;
    if (filter.userRole && l.userRole !== filter.userRole) return false;
    if (filter.action && l.action !== filter.action) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <Button variant="destructive" size="sm" onClick={() => {
          if (userRole !== "admin") {
            toast.error("You don't have permission to clear logs");
            return;
          }
          setClearModal(true);
        }}>
          <Trash2 className="h-4 w-4 mr-1" /> Clear All Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filter.entityType} onChange={(e) => setFilter({ ...filter, entityType: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="product">Products</option>
          <option value="order">Orders</option>
          <option value="discount">Discounts</option>
          <option value="user">Users</option>
        </select>
        <select value={filter.userRole} onChange={(e) => setFilter({ ...filter, userRole: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="tester">Tester</option>
        </select>
        <select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="status_change">Status Change</option>
        </select>
        {(filter.entityType || filter.userRole || filter.action) && (
          <button onClick={() => setFilter({ entityType: "", userRole: "", action: "" })} className="text-sm text-green-700 hover:text-green-800">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No activity logs found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log: any) => {
              const Icon = ENTITY_ICONS[log.entityType] || Package;
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className={`px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${log.isTestData ? "bg-purple-50/50" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-500 shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${ROLE_COLORS[log.userRole] || "text-gray-900"}`}>
                        {log.userName}
                      </span>
                      <Badge className={ACTION_COLORS[log.action] || ""}>{log.action}</Badge>
                      <span className="text-sm text-gray-600">
                        {log.entityType}{log.entityName ? `: ${log.entityName}` : ""}
                      </span>
                      {log.isTestData && <Badge variant="warning">Test</Badge>}
                      <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {/* Changes */}
                    {log.changes && typeof log.changes === "object" && !isExpanded && (
                      <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                        {Object.entries(log.changes).map(([field, val]: [string, any]) => (
                          <div key={field}>
                            <span className="font-medium">{field}:</span>{" "}
                            <span className="text-red-500 line-through">{formatValue(val?.old)}</span>{" → "}
                            <span className="text-green-600">{formatValue(val?.new)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded: full JSON details */}
                    {log.changes && typeof log.changes === "object" && isExpanded && (
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Clear all modal */}
      {clearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setClearModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100"><Trash2 className="h-5 w-5 text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Clear All Logs</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete all activity logs? This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setClearModal(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={async () => {
                const res = await fetch("/api/admin/logs", { method: "DELETE" });
                const json = await res.json();
                if (json.data) {
                  toast.success("All logs cleared");
                  setLogs([]);
                } else {
                  toast.error(json.message || "Failed to clear logs");
                }
                setClearModal(false);
              }}>Delete All</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
