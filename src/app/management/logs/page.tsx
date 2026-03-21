"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Package, ShoppingBag, Tag, UserCog } from "lucide-react";

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

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: "", userRole: "" });

  useEffect(() => {
    fetch("/api/management/logs")
      .then((r) => r.json())
      .then((json) => {
        setLogs(json.data || []);
        setLoading(false);
      });
  }, []);

  const filtered = logs.filter((l) => {
    if (filter.entityType && l.entityType !== filter.entityType) return false;
    if (filter.userRole && l.userRole !== filter.userRole) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Logs</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filter.entityType} onChange={(e) => setFilter({ ...filter, entityType: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="product">Products</option>
          <option value="order">Orders</option>
          <option value="discount">Discounts</option>
          <option value="user">Users</option>
        </select>
        <select value={filter.userRole} onChange={(e) => setFilter({ ...filter, userRole: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="tester">Tester</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No activity logs yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log: any) => {
              const Icon = ENTITY_ICONS[log.entityType] || Package;
              return (
                <div key={log.id} className={`px-5 py-4 flex items-start gap-4 ${log.isTestData ? "bg-purple-50/50" : ""}`}>
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
                    </div>

                    {/* Changes */}
                    {log.changes && (
                      <div className="mt-1 text-xs text-gray-500">
                        {Object.entries(log.changes).map(([field, val]: [string, any]) => (
                          <span key={field} className="inline-block mr-3">
                            <span className="font-medium">{field}:</span>{" "}
                            <span className="text-red-500 line-through">{String(val.old)}</span>{" → "}
                            <span className="text-green-600">{String(val.new)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
