"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatDate, formatDateShort } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { ArrowLeft, Mail, Phone, ShoppingBag, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  shippingStreet: "Street",
  shippingCity: "City",
  shippingZip: "Zip",
  shippingCountry: "Country",
};

const MISMATCH_LABELS: Record<string, string> = {
  name: "name",
  phone: "phone",
  address: "address",
};

function actorLabel(log: { actorType: string; actorName: string; actorRole: string | null }) {
  if (log.actorType === "customer") return `${log.actorName} (customer)`;
  const role = log.actorRole ? log.actorRole.charAt(0).toUpperCase() + log.actorRole.slice(1) : "Admin";
  return `${log.actorName} (${role})`;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCustomer(json.data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (!customer) return <div className="text-center py-12 text-gray-500">Customer not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/management/customers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.firstName} {customer.lastName}</h1>
          <p className="text-sm text-gray-500">Customer since {formatDate(customer.firstOrderDate)}</p>
          {customer.mismatchFields && customer.mismatchFields.length > 0 && (
            <button
              onClick={() => document.getElementById("change-history")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
              title={`Account differs from the latest order: ${customer.mismatchFields.map((f: string) => MISMATCH_LABELS[f] || f).join(", ")}`}
            >
              <AlertTriangle className="h-3 w-3" />
              Account data differs from latest order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — info + similar */}
        <div className="space-y-6">
          {/* Contact info */}
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{customer.phone}</span>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-500">
                  <ShoppingBag className="h-4 w-4" /> Orders
                </span>
                <span className="font-medium text-gray-900">{customer.orderCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-500">
                  <DollarSign className="h-4 w-4" /> Total Spent
                </span>
                <span className="font-medium text-gray-900">{formatPrice(customer.totalSpent)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-500">
                  <DollarSign className="h-4 w-4" /> Avg Order
                </span>
                <span className="font-medium text-gray-900">
                  {customer.orderCount > 0 ? formatPrice(Math.round(customer.totalSpent / customer.orderCount)) : "€0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" /> Last Order
                </span>
                <span className="text-gray-600 text-xs">
                  {formatDate(customer.lastOrderDate)}
                </span>
              </div>
            </div>
          </Card>

          {/* Similar customers */}
          {customer.similarCustomers.length > 0 && (
            <Card className="p-5 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h2 className="font-semibold text-orange-800">Similar Customers</h2>
              </div>
              <p className="text-xs text-orange-600 mb-3">These customers share the same email or phone number but have different details.</p>
              <div className="space-y-2">
                {customer.similarCustomers.map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/management/customers/${s.id}`}
                    className="block bg-white rounded-lg p-3 border border-orange-200 hover:border-orange-400 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-500">{s.email} · {s.phone}</p>
                    <p className="text-xs text-orange-600 mt-1">{s.reason}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right — orders */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Order History ({customer.orderCount})</h2>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-gray-400">No orders</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Order</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Date</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Payment</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Status</th>
                      <th className="text-right py-2 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((o: any) => (
                      <tr key={o.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 pr-4">
                          <Link href={`/management/orders/${o.id}`} className="font-mono text-green-700 hover:text-green-800">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">
                          {formatDateShort(o.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">
                          {o.paymentMethod === "cod" ? "COD" : "PayPal"}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={ORDER_STATUS_COLORS[o.status as OrderStatus]}>
                            {ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium">{formatPrice(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Change history — account edits only; never touches order snapshots */}
      <div id="change-history" className="mt-6">
      <Card className="p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Change history</h2>
        <p className="text-xs text-gray-500 mb-4">Who changed this account and what — admins, managers and the customer themselves. Order snapshots are never affected.</p>
        {(!customer.accountLogs || customer.accountLogs.length === 0) ? (
          <p className="text-sm text-gray-400">No changes recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {customer.accountLogs.map((log: { id: number; actorType: string; actorName: string; actorRole: string | null; action: string; changes: Record<string, { old: string | null; new: string | null }> | null; createdAt: string }) => (
              <div key={log.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-900">{actorLabel(log)}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(log.createdAt)}</span>
                </div>
                {log.action === "password_reset" ? (
                  <p className="text-xs text-gray-600 mt-1">Sent a password reset link</p>
                ) : log.changes ? (
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(log.changes).map(([field, val]) => (
                      <li key={field} className="text-xs text-gray-600">
                        <span className="text-gray-500">{FIELD_LABELS[field] || field}:</span>{" "}
                        <span className="line-through text-gray-400">{val.old || "—"}</span>{" "}
                        <span className="text-gray-400">→</span>{" "}
                        <span className="text-gray-800">{val.new || "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
