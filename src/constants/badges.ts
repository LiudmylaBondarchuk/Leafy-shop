export const PRODUCT_BADGES = {
  bestseller: {
    label: "Bestseller",
    starClassName: "text-amber-500",
    className: "bg-green-100 text-green-800 border border-green-300",
  },
  outOfStock: {
    label: "Out of stock",
    className: "bg-red-100 text-red-800",
  },
  lowStock: {
    label: "Low stock",
    className: "bg-orange-100 text-orange-800",
  },
} as const;
