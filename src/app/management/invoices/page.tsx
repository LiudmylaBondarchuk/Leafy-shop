"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { FileText, ExternalLink, Search, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function AdminInvoicesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [creditNotesMap, setCreditNotesMap] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/orders?limit=1000").then((r) => r.json()),
      fetch("/api/credit-notes").then((r) => r.json()),
    ]).then(([ordersJson, cnJson]) => {
      const allOrders = ordersJson.data?.orders || [];
      const invoiceOrders = allOrders.filter((o: any) => o.wantsInvoice);
      setOrders(invoiceOrders);

      const cnList = cnJson.data?.creditNotes || [];
      const map: Record<number, any> = {};
      for (const cn of cnList) {
        map[cn.orderId] = cn;
      }
      setCreditNotesMap(map);
      setLoading(false);
    });
  }, []);

  const isPaid = (order: any) => {
    return ["paid", "processing", "shipped", "delivered"].includes(order.status);
  };

  const getInvoiceStatus = (order: any) => {
    if (order.status === "cancelled") return "cancelled";
    if (isPaid(order)) return "issued";
    return "pending";
  };

  const filtered = orders.filter((order) => {
    if (search) {
      const q = search.toLowerCase();
      const name = `${order.customerFirstName} ${order.customerLastName}`.toLowerCase();
      const company = (order.invoiceCompany || "").toLowerCase();
      if (!name.includes(q) && !company.includes(q) && !order.orderNumber?.toLowerCase().includes(q) && !(order.invoiceNip || "").includes(q)) return false;
    }
    if (statusFilter) {
      const s = getInvoiceStatus(order);
      if (s !== statusFilter) return false;
    }
    if (dateFrom) {
      const d = new Date(order.createdAt).toISOString().split("T")[0];
      if (d < dateFrom) return false;
    }
    if (dateTo) {
      const d = new Date(order.createdAt).toISOString().split("T")[0];
      if (d > dateTo) return false;
    }
    return true;
  });

  const hasFilters = search || statusFilter || dateFrom || dateTo;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Invoices</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Invoices</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Issued (Paid)</p>
          <p className="text-xl font-bold text-green-700">{orders.filter(isPaid).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending (Awaiting Payment)</p>
          <p className="text-xl font-bold text-yellow-600">{orders.filter((o) => !isPaid(o) && o.status !== "cancelled").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Credit Notes</p>
          <p className="text-xl font-bold text-red-600">{Object.keys(creditNotesMap).length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, NIP..."
            className="rounded-lg border border-gray-300 dark:border-gray-600 pl-9 pr-3 py-2 text-sm w-full sm:w-64 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100">
          <option value="">All statuses</option>
          <option value="issued">Issued</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" title="Date from" />
          <span className="text-gray-400 text-sm">–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" title="Date to" />
        </div>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-green-700 hover:text-green-800">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {hasFilters ? "No invoices match your filters." : "No invoices yet. Invoices are created when customers select \"I need a VAT invoice\" during checkout."}
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer / Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: any) => {
                  const paid = isPaid(order);
                  const d = new Date(order.createdAt);
                  const invoiceNum = `INV/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(order.id).padStart(4, "0")}`;
                  const creditNote = creditNotesMap[order.id];

                  return (
                    <tr key={order.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{invoiceNum}</span>
                          {creditNote && (
                            <span className="relative group">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                Credit note issued: {creditNote.creditNoteNumber}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/management/orders/${order.id}`} className="font-mono text-green-700 hover:text-green-800 text-sm">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{order.invoiceCompany || `${order.customerFirstName} ${order.customerLastName}`}</p>
                          {order.invoiceNip && <p className="text-xs text-gray-400">NIP: {order.invoiceNip}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {formatDate(order.createdAt)}
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
                        <div className="flex items-center justify-end gap-2">
                          {paid && (
                            <a href={`/api/invoices/${order.id}`} target="_blank" className="text-green-700 hover:text-green-800" title="View invoice">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {creditNote && (
                            <a href={`/api/credit-notes/${order.id}`} target="_blank" className="text-red-600 hover:text-red-700" title="View credit note">
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3 p-3">
            {filtered.map((order: any) => {
              const paid = isPaid(order);
              const d = new Date(order.createdAt);
              const invoiceNum = `INV/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(order.id).padStart(4, "0")}`;
              const creditNote = creditNotesMap[order.id];

              return (
                <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate">{invoiceNum}</span>
                    {creditNote && (
                      <span title={`Credit note: ${creditNote.creditNoteNumber}`}>
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{order.invoiceCompany || `${order.customerFirstName} ${order.customerLastName}`}</p>
                    {order.invoiceNip && <p className="text-xs text-gray-400">NIP: {order.invoiceNip}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Link href={`/management/orders/${order.id}`} className="font-mono text-green-700 hover:text-green-800 text-xs">
                      {order.orderNumber}
                    </Link>
                    <span className="font-medium text-sm">{formatPrice(order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                    {order.status === "cancelled" ? (
                      <Badge variant="error">Cancelled</Badge>
                    ) : paid ? (
                      <Badge variant="success">Issued</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    <div className="flex items-center gap-2">
                      {paid && (
                        <a href={`/api/invoices/${order.id}`} target="_blank" className="text-green-700 hover:text-green-800" title="View invoice">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {creditNote && (
                        <a href={`/api/credit-notes/${order.id}`} target="_blank" className="text-red-600 hover:text-red-700" title="View credit note">
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
