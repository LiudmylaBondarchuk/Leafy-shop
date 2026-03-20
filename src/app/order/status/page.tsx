"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/constants/order-statuses";
import type { OrderStatus } from "@/constants/order-statuses";
import { Search, Check, Circle, Package, Truck, Home, XCircle, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Suspense } from "react";

const STATUS_ICONS: Record<string, any> = {
  new: Package,
  paid: Check,
  processing: Circle,
  shipped: Truck,
  delivered: Home,
  cancelled: XCircle,
  returned: RotateCcw,
};

const STATUS_FLOW = ["new", "paid", "processing", "shipped", "delivered"];

interface OrderData {
  orderNumber: string;
  status: string;
  customerFirstName: string;
  customerLastName: string;
  items: any[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  shippingMethod: string;
  total: number;
  createdAt: string;
  history: { status: string; date: string; note: string | null }[];
  canCancel: boolean;
  canReturn: boolean;
}

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const [orderNum, setOrderNum] = useState(searchParams.get("number") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = async () => {
    if (!orderNum.trim() || !email.trim()) {
      setError("Both order number and email are required");
      return;
    }
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/status?number=${encodeURIComponent(orderNum.trim())}&email=${encodeURIComponent(email.trim())}`);
      const json = await res.json();
      if (json.data) {
        setOrder(json.data);
      } else {
        setError(json.message || "Order not found");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if params present
  useEffect(() => {
    if (orderNum && email) fetchOrder();
  }, []); // eslint-disable-line

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      // Find order ID by fetching all orders (simplified — in real app would use order ID)
      const res = await fetch(`/api/orders/status?number=${order.orderNumber}&email=${email}`);
      const json = await res.json();
      // For now, just show a message
      toast.info("To cancel your order, please contact us at support@leafy.pl");
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Track Your Order</h1>

      {/* Search form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Order number" id="orderNum" value={orderNum} onChange={(e) => setOrderNum(e.target.value)} placeholder="LEA-20260320-0001" />
          <Input label="Email address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
        </div>
        <Button className="mt-4 w-full sm:w-auto" onClick={fetchOrder} loading={loading}>
          <Search className="mr-2 h-4 w-4" /> Find Order
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-8">
          {error}
        </div>
      )}

      {/* Order details */}
      {order && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Order</p>
                <p className="text-xl font-mono font-bold">{order.orderNumber}</p>
              </div>
              <Badge variant={order.status === "delivered" ? "success" : order.status === "cancelled" ? "error" : "info"} className={ORDER_STATUS_COLORS[order.status as OrderStatus]}>
                {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
              </Badge>
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Order Timeline</h3>
              <div className="space-y-4">
                {order.history.map((entry, i) => {
                  const Icon = STATUS_ICONS[entry.status] || Circle;
                  const isLast = i === order.history.length - 1;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isLast ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {i < order.history.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
                      </div>
                      <div className="pb-2">
                        <p className="font-medium text-sm">
                          {ORDER_STATUS_LABELS[entry.status as OrderStatus] || entry.status}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.date).toLocaleString("en-US", {
                            dateStyle: "medium", timeStyle: "short",
                          })}
                        </p>
                        {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
                      </div>
                    </div>
                  );
                })}

                {/* Future steps (not yet reached) */}
                {STATUS_FLOW.filter((s) => !order.history.some((h) => h.status === s) && !["cancelled", "returned"].includes(order.status)).map((s) => {
                  const Icon = STATUS_ICONS[s] || Circle;
                  return (
                    <div key={s} className="flex gap-3 opacity-40">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-sm text-gray-400">{ORDER_STATUS_LABELS[s as OrderStatus]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">Items</h3>
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
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
          </div>

          {/* Actions */}
          {(order.canCancel || order.canReturn) && (
            <div className="flex gap-3">
              {order.canCancel && (
                <Button variant="destructive" size="sm" onClick={handleCancel} loading={cancelling}>
                  Cancel Order
                </Button>
              )}
              {order.canReturn && (
                <Button variant="secondary" size="sm" onClick={() => toast.info("To request a return, please contact support@leafy.pl")}>
                  Request Return
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<div className="text-center py-12"><Spinner size="lg" /></div>}>
      <OrderStatusContent />
    </Suspense>
  );
}
