"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminInvoicesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders?limit=1000")
      .then((r) => r.json())
      .then((json) => {
        const allOrders = json.data?.orders || [];
        // Only orders that want invoice
        const invoiceOrders = allOrders.filter((o: any) => o.wantsInvoice);
        setOrders(invoiceOrders);
        setLoading(false);
      });
  }, []);

  const isPaid = (order: any) => {
    return ["paid", "processing", "shipped", "delivered"].includes(order.status);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invoices</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Invoices</p>
          <p className="text-xl font-bold text-gray-900">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Issued (Paid)</p>
          <p className="text-xl font-bold text-green-700">{orders.filter(isPaid).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Pending (Awaiting Payment)</p>
          <p className="text-xl font-bold text-yellow-600">{orders.filter((o) => !isPaid(o) && o.status !== "cancelled").length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading invoices...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No invoices yet. Invoices are created when customers select "I need a VAT invoice" during checkout.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Customer / Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const paid = isPaid(order);
                  const d = new Date(order.createdAt);
                  const invoiceNum = `INV/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(order.id).padStart(4, "0")}`;

                  return (
                    <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm text-gray-900">{invoiceNum}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/management/orders/${order.id}`} className="font-mono text-green-700 hover:text-green-800 text-sm">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{order.invoiceCompany || `${order.customerFirstName} ${order.customerLastName}`}</p>
                          {order.invoiceNip && <p className="text-xs text-gray-400">NIP: {order.invoiceNip}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3 text-center">
                        {order.status === "cancelled" ? (
                          <Badge variant="error">Cancelled</Badge>
                        ) : paid ? (
                          <Badge variant="success">Issued</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {paid && (
                          <a href={`/api/invoices/${order.id}`} target="_blank" className="text-green-700 hover:text-green-800">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
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
