"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Check, Circle } from "lucide-react";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusNote, setStatusNote] = useState("");
  const [changing, setChanging] = useState(false);

  const fetchOrder = () => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setOrder(json.data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    setChanging(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
      });
      const json = await res.json();
      if (json.data) {
        toast.success(`Status changed to ${ORDER_STATUS_LABELS[newStatus as OrderStatus]}`);
        setStatusNote("");
        fetchOrder(); // refresh
      } else {
        toast.error(json.message || "Failed to change status");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/orders" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            Placed on {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Badge className={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Items</h2>
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <div>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-gray-500 ml-2">{item.variantDesc} × {item.quantity}</span>
                </div>
                <span>{formatPrice(item.totalPrice)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-700"><span>Discount</span><span>-{formatPrice(order.discountAmount)}</span></div>
              )}
              <div className="flex justify-between"><span>Shipping</span><span>{order.shippingCost === 0 ? "Free" : formatPrice(order.shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </Card>

          {/* Customer info */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Customer</h2>
            <div className="text-sm space-y-1 text-gray-600">
              <p className="font-medium text-gray-900">{order.customerFirstName} {order.customerLastName}</p>
              <p>{order.customerEmail}</p>
              <p>{order.customerPhone}</p>
              <div className="border-t border-gray-100 pt-2 mt-2">
                <p className="font-medium text-gray-900 mb-1">Shipping Address</p>
                <p>{order.shippingStreet}</p>
                <p>{order.shippingZip} {order.shippingCity}</p>
              </div>
              <p className="pt-1">Shipping: {order.shippingMethod} {order.inpostCode ? `(${order.inpostCode})` : ""}</p>
              <p>Payment: {order.paymentMethod}</p>
              {order.wantsInvoice && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="font-medium text-gray-900 mb-1">Invoice</p>
                  <p>{order.invoiceCompany}</p>
                  <p>NIP: {order.invoiceNip}</p>
                  <p>{order.invoiceAddress}</p>
                </div>
              )}
              {order.notes && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="font-medium text-gray-900 mb-1">Notes</p>
                  <p className="italic">{order.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: status + history */}
        <div className="space-y-6">
          {/* Change status */}
          {order.availableTransitions?.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold mb-3">Change Status</h2>
              <div className="space-y-2">
                {order.availableTransitions.map((status: string) => (
                  <Button
                    key={status}
                    variant={status === "cancelled" ? "destructive" : "secondary"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleStatusChange(status)}
                    loading={changing}
                  >
                    → {ORDER_STATUS_LABELS[status as OrderStatus]}
                  </Button>
                ))}
              </div>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note (optional)"
                rows={2}
                className="w-full mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </Card>
          )}

          {/* History */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Status History</h2>
            <div className="space-y-3">
              {order.statusHistory?.map((entry: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                    {i < order.statusHistory.length - 1 && <div className="w-0.5 h-4 bg-gray-200 mt-1" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {entry.fromStatus ? `${ORDER_STATUS_LABELS[entry.fromStatus as OrderStatus]} → ` : ""}
                      {ORDER_STATUS_LABELS[entry.toStatus as OrderStatus]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                      {entry.changedBy && ` · ${entry.changedBy}`}
                    </p>
                    {entry.note && <p className="text-xs text-gray-500 italic mt-0.5">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
