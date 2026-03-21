import { db } from "@/lib/db";
import { productVariants, products } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { validateDiscountCode, calculateDiscountAmount } from "@/lib/discount-engine";
import { SHIPPING_METHODS, FREE_SHIPPING_THRESHOLD, COD_SURCHARGE } from "@/constants/shipping-methods";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, discount_code, shipping_method = "courier" } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return apiError("Cart is empty", 400, "EMPTY_CART");
    }

    // Fetch variants with product info
    const variantIds = items.map((i: any) => i.variant_id);
    const variants = await db
      .select({
        id: productVariants.id,
        productId: products.id,
        productName: products.name,
        productType: products.productType,
        categoryId: products.categoryId,
        weightGrams: productVariants.weightGrams,
        grindType: productVariants.grindType,
        price: productVariants.price,
        stock: productVariants.stock,
        isActive: productVariants.isActive,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(productVariants.id, variantIds));

    // Build calculated items
    const calculatedItems: any[] = [];
    for (const item of items as any[]) {
      const variant = variants.find((v: any) => v.id === item.variant_id);
      if (!variant) {
        return apiError(`Variant ${item.variant_id} not found`, 400, "VARIANT_NOT_FOUND");
      }
      if (!variant.isActive) {
        return apiError(`${variant.productName} is no longer available`, 400, "VARIANT_INACTIVE");
      }

      const quantity = Math.max(1, item.quantity);
      const inStock = variant.stock >= quantity;
      const weightLabel = variant.weightGrams >= 1000
        ? `${variant.weightGrams / 1000}kg`
        : `${variant.weightGrams}g`;
      const grindLabel = variant.grindType
        ? `, ${variant.grindType.replace("_", " ")}`
        : "";

      calculatedItems.push({
        variantId: variant.id,
        productName: variant.productName,
        variantDesc: `${weightLabel}${grindLabel}`,
        unitPrice: variant.price,
        quantity,
        totalPrice: variant.price * quantity,
        inStock,
        categoryId: variant.categoryId,
      });
    }

    // Check stock
    const outOfStock = calculatedItems.find((i) => !i.inStock);
    if (outOfStock) {
      return apiError(
        `${outOfStock.productName} (${outOfStock.variantDesc}) is not available in the requested quantity`,
        409,
        "OUT_OF_STOCK"
      );
    }

    // Calculate subtotal
    const subtotal = calculatedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    // Validate discount code
    let discount = null;
    let discountAmount = 0;

    if (discount_code) {
      const categoryIds = [...new Set(calculatedItems.map((i) => i.categoryId))];
      const validation = await validateDiscountCode(discount_code, subtotal, categoryIds);

      if (validation.valid) {
        const discountCodeData = await db.query.discountCodes.findFirst({
          where: eq(
            (await import("@/lib/db/schema")).discountCodes.code,
            discount_code.trim().toUpperCase()
          ),
        });

        discountAmount = calculateDiscountAmount(
          validation.type!,
          validation.value!,
          discountCodeData?.maxDiscount || null,
          subtotal,
          calculatedItems,
          discountCodeData?.categoryId || null
        );

        discount = {
          code: discount_code.trim().toUpperCase(),
          type: validation.type,
          description: validation.description,
          amount: discountAmount,
        };
      } else {
        return apiSuccess({
          items: calculatedItems.map(({ categoryId, ...rest }) => rest),
          subtotal,
          discount: null,
          discountError: validation.message,
          shippingCost: 0,
          total: subtotal,
        });
      }
    }

    // Calculate shipping
    const shippingConfig = SHIPPING_METHODS[shipping_method as keyof typeof SHIPPING_METHODS];
    let shippingCost = shippingConfig?.cost || SHIPPING_METHODS.courier.cost;

    // Free shipping threshold
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
    }

    // Free shipping discount code
    if (discount?.type === "free_shipping") {
      shippingCost = 0;
    }

    // COD surcharge
    // (handled at checkout, not here)

    const total = subtotal - discountAmount + shippingCost;

    return apiSuccess({
      items: calculatedItems.map(({ categoryId, ...rest }) => rest),
      subtotal,
      discount,
      shippingCost,
      total: Math.max(0, total),
    });
  } catch (error) {
    console.error("POST /api/cart/calculate error:", error);
    return apiError("Failed to calculate cart", 500);
  }
}
