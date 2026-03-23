import { db } from "@/lib/db";
import { orders, orderItems, products, productVariants } from "@/lib/db/schema-pg";
import { eq, and, sql } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    // Get all orders (optionally filtered by date)
    let allOrders: any[] = await db.select().from(orders);

    if (from) allOrders = allOrders.filter((o) => o.createdAt >= from);
    if (to) allOrders = allOrders.filter((o) => o.createdAt <= to + "T23:59:59");

    const activeOrders = allOrders.filter((o) => !["cancelled", "returned"].includes(o.status));

    // Revenue
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const totalShipping = activeOrders.reduce((sum, o) => sum + o.shippingCost, 0);
    const totalDiscount = activeOrders.reduce((sum, o) => sum + o.discountAmount, 0);
    const avgOrderValue = activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0;

    // Get order items with product info for cost calculation
    const allItems = await db
      .select({
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        productName: orderItems.productName,
        variantDesc: orderItems.variantDesc,
        variantCost: productVariants.cost,
        productType: products.productType,
        categoryId: products.categoryId,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId));

    // Filter items to only active orders
    const activeOrderIds = activeOrders.map((o: any) => o.id);
    const filteredItems = allItems.filter((i: any) => activeOrderIds.includes(i.orderId));

    // Cost & Margin
    const totalCost = filteredItems.reduce((sum: number, i: any) => sum + ((i.variantCost || 0) * i.quantity), 0);
    const totalMargin = totalRevenue - totalCost - totalShipping;
    const marginPercent = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

    // Daily revenue (for chart)
    const dailyRevenue: Record<string, number> = {};
    const dailyOrders: Record<string, number> = {};
    for (const o of activeOrders) {
      const day = o.createdAt.split("T")[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + o.total;
      dailyOrders[day] = (dailyOrders[day] || 0) + 1;
    }

    const revenueChart = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue, orders: dailyOrders[date] || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Orders by status
    const statusBreakdown: Record<string, number> = {};
    for (const o of allOrders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    }

    // Payment methods
    const paymentBreakdown: Record<string, number> = {};
    for (const o of allOrders) {
      const label = o.paymentMethod === "cod" ? "Cash on Delivery" : "PayPal";
      paymentBreakdown[label] = (paymentBreakdown[label] || 0) + 1;
    }

    // Shipping methods
    const shippingBreakdown: Record<string, number> = {};
    for (const o of activeOrders) {
      const labels: Record<string, string> = { courier: "Courier", inpost: "InPost", pickup: "Pickup" };
      const label = labels[o.shippingMethod] || o.shippingMethod;
      shippingBreakdown[label] = (shippingBreakdown[label] || 0) + 1;
    }

    // Top products by quantity
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const i of filteredItems) {
      const key = `${i.productId}`;
      if (!productSales[key]) productSales[key] = { name: i.productName, quantity: 0, revenue: 0 };
      productSales[key].quantity += i.quantity;
      productSales[key].revenue += i.totalPrice;
    }
    const topProductsByQty = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const topProductsByRevenue = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const i of filteredItems) {
      const type = i.productType === "coffee" ? "Coffee" : "Tea";
      categoryBreakdown[type] = (categoryBreakdown[type] || 0) + i.quantity;
    }

    // Unique customers
    const uniqueEmails = new Set(allOrders.map((o) => o.customerEmail));
    const returningCustomers = Array.from(uniqueEmails).filter(
      (email) => allOrders.filter((o) => o.customerEmail === email).length > 1
    ).length;

    return apiSuccess({
      summary: {
        totalOrders: allOrders.length,
        activeOrders: activeOrders.length,
        totalRevenue,
        totalCost,
        totalMargin,
        marginPercent,
        totalShipping,
        totalDiscount,
        avgOrderValue,
        uniqueCustomers: uniqueEmails.size,
        returningCustomers,
        cancelledOrders: allOrders.filter((o) => o.status === "cancelled").length,
        returnedOrders: allOrders.filter((o) => o.status === "returned").length,
      },
      charts: {
        revenueChart,
        statusBreakdown: Object.entries(statusBreakdown).map(([name, value]) => ({ name, value })),
        paymentBreakdown: Object.entries(paymentBreakdown).map(([name, value]) => ({ name, value })),
        shippingBreakdown: Object.entries(shippingBreakdown).map(([name, value]) => ({ name, value })),
        categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
        topProductsByQty,
        topProductsByRevenue,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch analytics", 500);
  }
}
