import { db } from "@/lib/db";
import { orders, customers as customersTable, customerAccountLogs } from "@/lib/db/schema-pg";
import { eq, desc } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { authorize } from "@/lib/require-permission";
import { apiSuccess, apiError } from "@/lib/utils";

const norm = (v: string | null | undefined) => (v || "").trim().toLowerCase();

type OrderRow = typeof orders.$inferSelect;
type AccountRow = typeof customersTable.$inferSelect;
type LogRow = typeof customerAccountLogs.$inferSelect;

async function accountLogs(accountId: number) {
  const rows = await db
    .select()
    .from(customerAccountLogs)
    .where(eq(customerAccountLogs.customerId, accountId))
    .orderBy(desc(customerAccountLogs.createdAt));

  return rows.map((l: LogRow) => ({
    id: l.id,
    actorType: l.actorType,
    actorName: l.actorName,
    actorRole: l.actorRole,
    action: l.action,
    changes: l.changes ? JSON.parse(l.changes) : null,
    createdAt: l.createdAt,
  }));
}

// Which live-account fields diverge from the latest order snapshot.
// Only compared when the account actually holds a value — an empty account
// phone/address is "not set", not a divergence.
function mismatchFields(account: AccountRow, latestOrder: OrderRow | null): string[] {
  if (!latestOrder) return [];
  const fields: string[] = [];

  if (
    norm(account.firstName) !== norm(latestOrder.customerFirstName) ||
    norm(account.lastName) !== norm(latestOrder.customerLastName)
  ) {
    fields.push("name");
  }

  if (account.phone && norm(account.phone) !== norm(latestOrder.customerPhone)) {
    fields.push("phone");
  }

  if (account.shippingStreet) {
    const accAddr = [account.shippingStreet, account.shippingCity, account.shippingZip, account.shippingCountry].map(norm).join("|");
    const ordAddr = [latestOrder.shippingStreet, latestOrder.shippingCity, latestOrder.shippingZip, latestOrder.shippingCountry].map(norm).join("|");
    if (accAddr !== ordAddr) fields.push("address");
  }

  return fields;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const denied = await authorize("customers.view");
  if (denied) return denied;

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
      const allOrders: OrderRow[] = await db.select().from(orders);
      const customerOrders = allOrders
        .filter((o) => o.customerEmail.toLowerCase() === account.email.toLowerCase())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const latestOrder = customerOrders[0] ?? null;

      return apiSuccess({
        email: account.email,
        phone: account.phone || "",
        firstName: account.firstName,
        lastName: account.lastName,
        orderCount: customerOrders.length,
        totalSpent: customerOrders.filter((o) => !["cancelled", "returned", "pending_payment"].includes(o.status)).reduce((sum, o) => sum + o.total, 0),
        firstOrderDate: customerOrders.length > 0 ? customerOrders[customerOrders.length - 1].createdAt : account.createdAt,
        lastOrderDate: customerOrders.length > 0 ? customerOrders[0].createdAt : account.createdAt,
        hasAccount: true,
        accountId: account.id,
        mismatchFields: mismatchFields(account, latestOrder),
        accountLogs: await accountLogs(account.id),
        orders: customerOrders.map((o) => ({
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

    const allOrders: OrderRow[] = await db.select().from(orders);

    // Find all orders matching this customer
    const customerOrders = allOrders.filter((o) =>
      o.customerEmail.toLowerCase() === email &&
      o.customerFirstName.toLowerCase() === firstName &&
      o.customerLastName.toLowerCase() === lastName &&
      o.customerPhone === phone
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (customerOrders.length === 0) return apiError("Customer not found", 404);

    const first = customerOrders[0];
    const activeOrders = customerOrders.filter((o) => !["cancelled", "returned", "pending_payment"].includes(o.status));

    // If this order-derived customer maps to a registered account, show the live
    // account identity (name/phone) instead of the frozen order snapshot.
    const account = await db.query.customers.findFirst({
      where: eq(customersTable.email, email),
    });

    // Find similar customers
    const similarCustomers: { id: string; email: string; firstName: string; lastName: string; phone: string; reason: string }[] = [];
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
      phone: account ? (account.phone || "") : first.customerPhone,
      firstName: account ? account.firstName : first.customerFirstName,
      lastName: account ? account.lastName : first.customerLastName,
      orderCount: customerOrders.length,
      totalSpent: activeOrders.reduce((sum, o) => sum + o.total, 0),
      firstOrderDate: customerOrders[customerOrders.length - 1].createdAt,
      lastOrderDate: customerOrders[0].createdAt,
      hasAccount: !!account,
      accountId: account?.id ?? null,
      mismatchFields: account ? mismatchFields(account, first) : [],
      accountLogs: account ? await accountLogs(account.id) : [],
      orders: customerOrders.map((o) => ({
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
