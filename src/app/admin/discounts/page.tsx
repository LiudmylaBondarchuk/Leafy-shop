"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/discount-codes")
      .then((r) => r.json())
      .then((json) => {
        setCodes(json.data || []);
        setLoading(false);
      });
  }, []);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "percentage": return "Percentage";
      case "fixed_amount": return "Fixed Amount";
      case "free_shipping": return "Free Shipping";
      default: return type;
    }
  };

  const getValueLabel = (code: any) => {
    if (code.type === "percentage") return `${code.value / 100}%`;
    if (code.type === "fixed_amount") return formatPrice(code.value);
    return "—";
  };

  const getStatus = (code: any) => {
    if (!code.isActive) return { label: "Inactive", variant: "error" as const };
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return { label: "Expired", variant: "warning" as const };
    if (code.usageLimit && code.usageCount >= code.usageLimit) return { label: "Used up", variant: "warning" as const };
    return { label: "Active", variant: "success" as const };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No discount codes yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Min Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Usage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Expires</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code: any) => {
                  const status = getStatus(code);
                  return (
                    <tr key={code.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-gray-900">{code.code}</span>
                        {code.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{code.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getTypeLabel(code.type)}</td>
                      <td className="px-4 py-3 font-medium">{getValueLabel(code)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.minOrderValue ? formatPrice(code.minOrderValue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.usageCount}{code.usageLimit ? ` / ${code.usageLimit}` : " / ∞"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.expiresAt
                          ? new Date(code.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
