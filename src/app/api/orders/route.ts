import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory, productVariants, products, discountCodes } from "@/lib/db/schema";
import { eq, and, sql, like, or, desc } from "drizzle-orm";
import { orderSchema } from "@/lib/validators/order";
import { validateDiscountCode, calculateDiscountAmount } from "@/lib/discount-engine";
import { SHIPPING_METHODS, FREE_SHIPPING_THRESHOLD, COD_SURCHARGE } from "@/constants/shipping-methods";
import { generateOrderNumber, apiSuccess, apiError } from "@/lib/utils";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));

    const conditions = [];
    if (status) conditions.push(eq(orders.status, status));
    if (search) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${search}%`),
          like(orders.customerEmail, `%${search}%`),
          like(orders.customerLastName, `%${search}%`)
        )!
      );
    }

    const allOrders = await db
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt));

    const total = allOrders.length;
    const paginated = allOrders.slice((page - 1) * limit, page * limit);

    return apiSuccess({
      orders: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return apiError("Failed to fetch orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Order validation errors:", JSON.stringify(parsed.error, null, 2));
      return apiError("Validation failed", 400, "VALIDATION_ERROR");
    }

    const data = parsed.data;

    // Fetch variants with product info
    const variantIds = data.items.map((i) => i.variant_id);
    const variantRows = [];
    for (const vid of variantIds) {
      const v = await db
        .select({
          id: productVariants.id,
          productId: products.id,
          productName: products.name,
          categoryId: products.categoryId,
          weightGrams: productVariants.weightGrams,
          grindType: productVariants.grindType,
          price: productVariants.price,
          stock: productVariants.stock,
          isActive: productVariants.isActive,
          productActive: products.isActive,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(eq(productVariants.id, vid))
        .then((rows: any[]) => rows[0]);

      if (!v) return apiError(`Variant ${vid} not found`, 400, "VARIANT_NOT_FOUND");
      if (!v.isActive || !v.productActive) return apiError(`${v.productName} is no longer available`, 400, "VARIANT_INACTIVE");

      const requestedQty = data.items.find((i) => i.variant_id === vid)!.quantity;
      if (v.stock < requestedQty) {
        return apiError(`${v.productName} — only ${v.stock} available`, 409, "OUT_OF_STOCK");
      }

      variantRows.push({ ...v, quantity: requestedQty });
    }

    // Calculate prices from DB (never trust frontend prices)
    const itemsForCalc = variantRows.map((v) => ({
      variantId: v.id,
      categoryId: v.categoryId,
      unitPrice: v.price,
      quantity: v.quantity,
    }));

    const subtotal = itemsForCalc.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // Discount
    let discountAmount = 0;
    let discountCodeId: number | null = null;

    if (data.discount_code) {
      const categoryIds = [...new Set(itemsForCalc.map((i) => i.categoryId))];
      const validation = await validateDiscountCode(data.discount_code, subtotal, categoryIds);

      if (validation.valid && validation.discountCodeId) {
        const dc = await db.query.discountCodes.findFirst({
          where: eq(discountCodes.id, validation.discountCodeId),
        });

        discountAmount = calculateDiscountAmount(
          validation.type!,
          validation.value!,
          dc?.maxDiscount || null,
          subtotal,
          itemsForCalc,
          dc?.categoryId || null
        );
        discountCodeId = validation.discountCodeId;
      }
    }

    // Shipping
    const shippingMethod = data.shipping.method as keyof typeof SHIPPING_METHODS;
    let shippingCost = SHIPPING_METHODS[shippingMethod]?.cost || SHIPPING_METHODS.courier.cost;

    if (subtotal >= FREE_SHIPPING_THRESHOLD) shippingCost = 0;

    // Check if discount is free_shipping type
    if (data.discount_code && discountCodeId) {
      const dc = await db.query.discountCodes.findFirst({
        where: eq(discountCodes.id, discountCodeId),
      });
      if (dc?.type === "free_shipping") shippingCost = 0;
    }

    // COD surcharge
    if (data.payment.method === "cod") shippingCost += COD_SURCHARGE;

    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    // Generate order number
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const existingOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(sql`date(${orders.createdAt}) = ${todayStr}`);
    const orderNumber = generateOrderNumber(today, existingOrders.length + 1);

    // INSERT in transaction-like sequence (SQLite is single-writer)
    const [order] = db
      .insert(orders)
      .values({
        orderNumber,
        status: "new",
        customerEmail: data.customer.email.trim().toLowerCase(),
        customerPhone: data.customer.phone,
        customerFirstName: data.customer.first_name.trim(),
        customerLastName: data.customer.last_name.trim(),
        shippingStreet: data.shipping.street.trim(),
        shippingCity: data.shipping.city.trim(),
        shippingZip: data.shipping.zip,
        shippingMethod: data.shipping.method,
        shippingCost,
        inpostCode: data.shipping.inpost_code || null,
        paymentMethod: data.payment.method,
        wantsInvoice: data.invoice?.wants_invoice || false,
        invoiceCompany: data.invoice?.company || null,
        invoiceNip: data.invoice?.nip || null,
        invoiceAddress: data.invoice?.address || null,
        subtotal,
        discountAmount,
        discountCodeId,
        total,
        notes: data.notes || null,
      })
      .returning()
      .all();

    // Insert order items
    for (const v of variantRows) {
      const weightLabel = v.weightGrams >= 1000 ? `${v.weightGrams / 1000}kg` : `${v.weightGrams}g`;
      const grindLabel = v.grindType ? `, ${v.grindType.replace("_", " ")}` : "";

      db.insert(orderItems)
        .values({
          orderId: order.id,
          productId: v.productId,
          variantId: v.id,
          productName: v.productName,
          variantDesc: `${weightLabel}${grindLabel}`,
          quantity: v.quantity,
          unitPrice: v.price,
          totalPrice: v.price * v.quantity,
        })
        .run();
    }

    // Insert status history
    db.insert(orderStatusHistory)
      .values({
        orderId: order.id,
        fromStatus: null,
        toStatus: "new",
        changedBy: "system",
        note: "Order placed",
      })
      .run();

    // Decrement stock
    for (const v of variantRows) {
      db.update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${v.quantity}` })
        .where(eq(productVariants.id, v.id))
        .run();
    }

    // Increment discount code usage
    if (discountCodeId) {
      db.update(discountCodes)
        .set({ usageCount: sql`${discountCodes.usageCount} + 1` })
        .where(eq(discountCodes.id, discountCodeId))
        .run();
    }

    // Send confirmation email (async, don't block response)
    sendOrderConfirmationEmail({
      orderNumber,
      customerName: data.customer.first_name,
      customerEmail: data.customer.email.trim().toLowerCase(),
      items: variantRows.map((v) => {
        const wl = v.weightGrams >= 1000 ? `${v.weightGrams / 1000}kg` : `${v.weightGrams}g`;
        const gl = v.grindType ? `, ${v.grindType.replace("_", " ")}` : "";
        return { productName: v.productName, variantDesc: `${wl}${gl}`, quantity: v.quantity, totalPrice: v.price * v.quantity };
      }),
      subtotal,
      discountAmount,
      shippingCost,
      total,
      shippingMethod: data.shipping.method,
      shippingAddress: `${data.shipping.street}, ${data.shipping.zip} ${data.shipping.city}`,
    }).catch(() => {});

    return apiSuccess(
      { orderNumber, status: "new", total },
      201
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return apiError("Failed to create order", 500);
  }
}
