import { ORDER_TRANSITIONS, type OrderStatus } from "@/constants/order-statuses";

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function getAvailableTransitions(from: OrderStatus): OrderStatus[] {
  return [...ORDER_TRANSITIONS[from]];
}

export function transition(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. Allowed transitions from "${from}": ${ORDER_TRANSITIONS[from].join(", ") || "none"}`
    );
  }
  return to;
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}
