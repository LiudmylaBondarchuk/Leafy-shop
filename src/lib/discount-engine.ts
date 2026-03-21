import { db } from "@/lib/db";
import { discountCodes } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  message?: string;
  type?: string;
  value?: number;
  description?: string;
  discountCodeId?: number;
}

export interface CartItemForDiscount {
  variantId: number;
  categoryId: number;
  unitPrice: number;
  quantity: number;
}

export async function validateDiscountCode(
  code: string,
  cartSubtotal: number,
  categoryIds: number[]
): Promise<DiscountValidationResult> {
  const normalizedCode = code.trim().toUpperCase();

  const discountCode = await db.query.discountCodes.findFirst({
    where: eq(discountCodes.code, normalizedCode),
  });

  if (!discountCode) {
    return { valid: false, reason: "NOT_FOUND", message: "Invalid discount code." };
  }

  if (!discountCode.isActive) {
    return { valid: false, reason: "INACTIVE", message: "This discount code is no longer active." };
  }

  const now = new Date().toISOString();

  if (discountCode.startsAt > now) {
    return { valid: false, reason: "NOT_STARTED", message: "This discount code is not yet active." };
  }

  if (discountCode.expiresAt && discountCode.expiresAt < now) {
    return { valid: false, reason: "EXPIRED", message: "This discount code has expired." };
  }

  if (discountCode.usageLimit !== null && discountCode.usageCount >= discountCode.usageLimit) {
    return { valid: false, reason: "USED", message: "This discount code has already been used." };
  }

  if (discountCode.minOrderValue !== null && cartSubtotal < discountCode.minOrderValue) {
    const minFormatted = (discountCode.minOrderValue / 100).toFixed(2);
    return {
      valid: false,
      reason: "MIN_ORDER",
      message: `Minimum order value is $${minFormatted}.`,
    };
  }

  if (discountCode.categoryId !== null && !categoryIds.includes(discountCode.categoryId)) {
    return {
      valid: false,
      reason: "CATEGORY_MISMATCH",
      message: "This code does not apply to the products in your cart.",
    };
  }

  let description = "";
  if (discountCode.type === "percentage") {
    description = `${discountCode.value / 100}% off`;
  } else if (discountCode.type === "fixed_amount") {
    description = `$${(discountCode.value / 100).toFixed(2)} off`;
  } else if (discountCode.type === "free_shipping") {
    description = "Free shipping";
  }

  return {
    valid: true,
    type: discountCode.type,
    value: discountCode.value,
    description,
    discountCodeId: discountCode.id,
  };
}

export function calculateDiscountAmount(
  type: string,
  value: number,
  maxDiscount: number | null,
  subtotal: number,
  items: CartItemForDiscount[],
  categoryId: number | null
): number {
  let applicableSubtotal = subtotal;

  if (categoryId !== null) {
    applicableSubtotal = items
      .filter((item) => item.categoryId === categoryId)
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  if (applicableSubtotal <= 0) return 0;

  let discount = 0;

  if (type === "percentage") {
    discount = Math.round((applicableSubtotal * value) / 10000);
    if (maxDiscount !== null) {
      discount = Math.min(discount, maxDiscount);
    }
  } else if (type === "fixed_amount") {
    discount = Math.min(value, applicableSubtotal);
  } else if (type === "free_shipping") {
    discount = 0; // shipping cost handled separately
  }

  return discount;
}
