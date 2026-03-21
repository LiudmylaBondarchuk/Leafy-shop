import { PRODUCT_BADGES } from "@/constants/badges";

export function BestsellerBadge() {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCT_BADGES.bestseller.className}`}>
      <span className={PRODUCT_BADGES.bestseller.starClassName}>★</span>
      {PRODUCT_BADGES.bestseller.label}
    </span>
  );
}

export function OutOfStockBadge() {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCT_BADGES.outOfStock.className}`}>
      {PRODUCT_BADGES.outOfStock.label}
    </span>
  );
}
