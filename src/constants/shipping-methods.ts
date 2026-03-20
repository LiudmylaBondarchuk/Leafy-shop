export const SHIPPING_METHODS = {
  courier: { label: "Courier (DPD)", cost: 1499 },
  inpost: { label: "InPost Parcel Locker", cost: 999 },
  pickup: { label: "In-store Pickup", cost: 0 },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export const FREE_SHIPPING_THRESHOLD = 10000; // 100.00 USD in cents
export const COD_SURCHARGE = 500; // 5.00 USD in cents
