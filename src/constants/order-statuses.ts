export const ORDER_STATUSES = [
  "pending_payment",
  "new",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting Payment",
  new: "New",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  new: "bg-gray-100 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-yellow-100 text-yellow-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
};

// Default transitions (prepaid: PayPal etc.)
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  new: ["paid", "processing", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["paid", "returned"],
  cancelled: [],
  returned: [],
};

// Get available transitions based on payment method and order history
export function getTransitionsForOrder(status: OrderStatus, paymentMethod?: string, statusHistory?: { fromStatus: string | null; toStatus: string }[]): OrderStatus[] {
  if (paymentMethod === "cod") {
    // COD flow: new → processing → shipped → delivered → paid (end)
    switch (status) {
      case "pending_payment": return ["cancelled"];
      case "new": return ["processing", "cancelled"];
      case "processing": return ["shipped", "cancelled"];
      case "shipped": return ["delivered"];
      case "delivered": return ["paid", "returned"];
      case "paid": return []; // COD paid after delivery = end
      case "cancelled": return [];
      case "returned": return [];
      default: return [];
    }
  } else {
    // Prepaid flow: pending_payment → paid → processing → shipped → delivered (end)
    switch (status) {
      case "pending_payment": return ["cancelled"];
      case "new": return ["paid", "cancelled"];
      case "paid": return ["processing", "cancelled"];
      case "processing": return ["shipped", "cancelled"];
      case "shipped": return ["delivered"];
      case "delivered": return ["returned"];
      case "cancelled": return [];
      case "returned": return [];
      default: return [];
    }
  }
}
