import { db } from "@/lib/db";
import { orders, customers as customersTable } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const { id } = await params;

    // Decode the base64url ID back to key
    const key = Buffer.from(id, "base64url").toString();

    // Handle account-only customers (no orders)
    if (key.startsWith("account|")) {
      const accountId = parseInt(key.split("|")[1]);
      const account = await db.query.customers.findFirst({
        where: eq(customersTable.id, accountId),
      });
      if (!account) return apiError("Customer not found", 404);

      // Check if they have any orders by email
      const allOrders: any[] = await db.select().from(orders);
      const customerOrders = allOrders
        .filter((o) => o.customerEmail.toLowerCase() === account.email.toLowerCase())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return apiSuccess({
        email: account.email,
        phone: account.phone || "",
        firstName: account.firstName,
        lastName: account.lastName,
        orderCount: customerOrders.length,
        totalSpent: customerOrders.filter((o: any) => !["cancelled", "returned"].includes(o.status)).reduce((sum: number, o: any) => sum + o.total, 0),
        firstOrderDate: customerOrders.length > 0 ? customerOrders[customerOrders.length - 1].createdAt : account.createdAt,
        lastOrderDate: customerOrders.length > 0 ? customerOrders[0].createdAt : account.createdAt,
        hasAccount: true,
        accountId: account.id,
        orders: customerOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          total: o.total,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
        })),
        similarCustomers: [],
      });
    }

    const [email, firstName, lastName, phone] = key.split("|");

    if (!email) return apiError("Customer not found", 404);

    const allOrders: any[] = await db.select().from(orders);

    // Find all orders matching this customer
    const customerOrders = allOrders.filter((o) =>
      o.customerEmail.toLowerCase() === email &&
      o.customerFirstName.toLowerCase() === firstName &&
      o.customerLastName.toLowerCase() === lastName &&
      o.customerPhone === phone
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (customerOrders.length === 0) return apiError("Customer not found", 404);

    const first = customerOrders[0];
    const activeOrders = customerOrders.filter((o) => !["cancelled", "returned"].includes(o.status));

    // Find similar customers
    const similarCustomers: any[] = [];
    for (const o of allOrders) {
      const oEmail = o.customerEmail.toLowerCase();
      const oFirstName = o.customerFirstName.toLowerCase();
      const oLastName = o.customerLastName.toLowerCase();

      // Skip if same customer
      if (oEmail === email && oFirstName === firstName && oLastName === lastName && o.customerPhone === phone) continue;

      let reason = "";
      if (oEmail === email && (oFirstName !== firstName || oLastName !== lastName)) {
        reason = "Same email, different name";
      } else if (o.customerPhone === phone && oEmail !== email) {
        reason = "Same phone, different email";
      } else if (o.customerPhone === phone && (oFirstName !== firstName || oLastName !== lastName)) {
        reason = "Same phone, different name";
      }

      if (reason) {
        const simKey = `${oEmail}|${oFirstName}|${oLastName}|${o.customerPhone}`;
        const simId = Buffer.from(simKey).toString("base64url");
        if (!similarCustomers.some((s) => s.id === simId)) {
          similarCustomers.push({
            id: simId,
            email: o.customerEmail,
            firstName: o.customerFirstName,
            lastName: o.customerLastName,
            phone: o.customerPhone,
            reason,
          });
        }
      }
    }

    return apiSuccess({
      email: first.customerEmail,
      phone: first.customerPhone,
      firstName: first.customerFirstName,
      lastName: first.customerLastName,
      orderCount: customerOrders.length,
      totalSpent: activeOrders.reduce((sum: number, o: any) => sum + o.total, 0),
      firstOrderDate: customerOrders[customerOrders.length - 1].createdAt,
      lastOrderDate: customerOrders[0].createdAt,
      orders: customerOrders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
      })),
      similarCustomers,
    });
  } catch (error) {
    console.error("GET /api/admin/customers/[id] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch customer", 500);
  }
}
