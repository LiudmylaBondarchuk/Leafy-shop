"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Check, Circle, AlertTriangle } from "lucide-react";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusNote, setStatusNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [changing, setChanging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchOrder = () => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setOrder(json.data);
          setInternalNotes(json.data.internalNotes || "");
        }
        setLoading(false);
      });
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes }),
      });
      const json = await res.json();
      if (json.data) {
        toast.success("Internal notes saved");
      } else {
        toast.error(json.message || "Failed to save notes");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setChanging(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote || undefined,
          trackingNumber: newStatus === "shipped" && trackingNumber ? trackingNumber : undefined,
        }),
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
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link href="/management/orders" className="text-gray-400 hover:text-gray-600 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-all">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            Placed on {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge className={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
        </Badge>
      </div>

      {/* Cancelled/Returned alert */}
      {order.status === "cancelled" && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Order Cancelled</h3>
              <p className="text-sm text-red-700 mt-1">
                {order.statusHistory?.find((h: any) => h.toStatus === "cancelled")?.changedBy === "customer"
                  ? "This order was cancelled by the customer."
                  : "This order was cancelled by admin."}
                {order.paymentMethod !== "cod" && " A refund needs to be processed manually via the payment provider."}
              </p>
              <p className="text-xs text-red-500 mt-2">
                Stock has been automatically restored. {order.discountCodeId ? "Discount code usage has been reverted." : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {order.status === "returned" && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Return Processed</h3>
              <p className="text-sm text-orange-700 mt-1">
                This order has been returned. A refund needs to be processed manually via the payment provider.
              </p>
              <p className="text-xs text-orange-500 mt-2">
                Stock has been automatically restored.
              </p>
            </div>
          </div>
        </div>
      )}

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
            {order.wantsInvoice && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a href={`/api/invoices/${order.id}`} target="_blank" className="text-sm text-green-700 hover:text-green-800 font-medium">
                  📄 View Invoice
                </a>
              </div>
            )}
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
              {order.trackingNumber && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="font-medium text-gray-900 mb-1">Tracking Number</p>
                  <p className="font-mono text-green-700">{order.trackingNumber}</p>
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
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 mb-3"
              >
                <option value="">Select new status...</option>
                {order.availableTransitions.map((status: string) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status as OrderStatus]}
                  </option>
                ))}
              </select>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note (optional)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 mb-3"
              />
              {selectedStatus === "shipped" && (
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking number (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 mb-3"
                />
              )}
              <Button
                variant={selectedStatus === "cancelled" ? "destructive" : "primary"}
                size="sm"
                className="w-full"
                disabled={!selectedStatus}
                onClick={() => setShowConfirm(true)}
              >
                Update Status
              </Button>
            </Card>
          )}

          {/* Confirmation modal */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
              <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${selectedStatus === "cancelled" ? "bg-red-100" : "bg-green-100"}`}>
                    <AlertTriangle className={`h-5 w-5 ${selectedStatus === "cancelled" ? "text-red-600" : "text-green-600"}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Confirm Status Change</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Change order <strong>{order.orderNumber}</strong> status from{" "}
                  <strong>{ORDER_STATUS_LABELS[order.status as OrderStatus]}</strong> to{" "}
                  <strong>{ORDER_STATUS_LABELS[selectedStatus as OrderStatus]}</strong>?
                </p>
                {selectedStatus === "cancelled" && (
                  <p className="text-sm text-red-600 mb-2">
                    This will restore stock and notify the customer via email.
                    {order.paymentMethod !== "cod" && " A refund will need to be processed manually."}
                  </p>
                )}
                {selectedStatus !== "cancelled" && (
                  <p className="text-sm text-gray-500 mb-2">
                    The customer will be notified via email.
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant={selectedStatus === "cancelled" ? "destructive" : "primary"}
                    size="sm"
                    className="flex-1"
                    loading={changing}
                    onClick={async () => {
                      await handleStatusChange(selectedStatus);
                      setShowConfirm(false);
                      setSelectedStatus("");
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
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
                      {formatDateTime(entry.createdAt)}
                      {entry.changedBy && ` · ${entry.changedBy}`}
                    </p>
                    {entry.note && <p className="text-xs text-gray-500 italic mt-0.5">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Internal Notes */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Internal Notes</h2>
            {order.internalNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-amber-700 mb-1">Saved notes</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{order.internalNotes}</p>
              </div>
            )}
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add internal notes (not visible to customers)..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 mb-3"
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={savingNotes}
              onClick={handleSaveNotes}
            >
              Save Notes
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
