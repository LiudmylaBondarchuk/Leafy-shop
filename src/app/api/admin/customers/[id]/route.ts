import { db } from "@/lib/db";
import { orders, customers as customersTable, customerAccountLogs } from "@/lib/db/schema-pg";
import { eq, desc } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { authorize } from "@/lib/require-permission";
import { orderBelongsToCustomer } from "@/lib/customer-orders";
import { apiSuccess, apiError } from "@/lib/utils";

const norm = (v: string | null | undefined) => (v || "").trim().toLowerCase();

type OrderRow = typeof orders.$inferSelect;
type AccountRow = typeof customersTable.$inferSelect;
type LogRow = typeof customerAccountLogs.$inferSelect;

const mapOrder = (o: OrderRow) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  status: o.status,
  total: o.total,
  paymentMethod: o.paymentMethod,
  createdAt: o.createdAt,
});

const isActive = (o: OrderRow) => !["cancelled", "returned", "pending_payment"].includes(o.status);

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
    const key = Buffer.from(id, "base64url").toString();
    const allOrders: OrderRow[] = await db.select().from(orders);

    // Resolve the account this row represents (if any), and — for guest rows —
    // the snapshot orders that define it.
    let account: AccountRow | null = null;
    let snapshotOrders: OrderRow[] = [];
    let snapshotKey: { email: string; firstName: string; lastName: string; phone: string } | null = null;

    if (key.startsWith("account|")) {
      const accountId = parseInt(key.split("|")[1]);
      account = (await db.query.customers.findFirst({ where: eq(customersTable.id, accountId) })) ?? null;
      if (!account) return apiError("Customer not found", 404);
    } else {
      const [email, firstName, lastName, phone] = key.split("|");
      if (!email) return apiError("Customer not found", 404);

      snapshotOrders = allOrders
        .filter((o) =>
          o.customerEmail.toLowerCase() === email &&
          o.customerFirstName.toLowerCase() === firstName &&
          o.customerLastName.toLowerCase() === lastName &&
          o.customerPhone === phone
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (snapshotOrders.length === 0) return apiError("Customer not found", 404);

      // These snapshot orders may belong to a registered account — via a
      // customerId link, or via the email. Resolve to that account if so.
      const linkedId = snapshotOrders.find((o) => o.customerId)?.customerId;
      if (linkedId) {
        account = (await db.query.customers.findFirst({ where: eq(customersTable.id, linkedId) })) ?? null;
      }
      if (!account) {
        account = (await db.query.customers.findFirst({ where: eq(customersTable.email, email) })) ?? null;
      }
      if (!account) {
        snapshotKey = {
          email: snapshotOrders[0].customerEmail,
          firstName: snapshotOrders[0].customerFirstName,
          lastName: snapshotOrders[0].customerLastName,
          phone: snapshotOrders[0].customerPhone,
        };
      }
    }

    // Account row — orders resolved by the shared rule (customerId OR email).
    if (account) {
      const custOrders = allOrders
        .filter((o) => orderBelongsToCustomer(o, account!))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const activeOrders = custOrders.filter(isActive);
      const latest = custOrders[0] ?? null;

      return apiSuccess({
        email: account.email,
        phone: account.phone || "",
        firstName: account.firstName,
        lastName: account.lastName,
        orderCount: custOrders.length,
        totalSpent: activeOrders.reduce((sum, o) => sum + o.total, 0),
        firstOrderDate: custOrders.length > 0 ? custOrders[custOrders.length - 1].createdAt : account.createdAt,
        lastOrderDate: custOrders.length > 0 ? custOrders[0].createdAt : account.createdAt,
        hasAccount: true,
        accountId: account.id,
        mismatchFields: mismatchFields(account, latest),
        accountLogs: await accountLogs(account.id),
        orders: custOrders.map(mapOrder),
        similarCustomers: [],
      });
    }

    // Guest row — snapshot identity, no account/logs. Flag look-alikes.
    const { email, firstName, lastName, phone } = snapshotKey!;
    const activeOrders = snapshotOrders.filter(isActive);

    const similarCustomers: { id: string; email: string; firstName: string; lastName: string; phone: string; reason: string }[] = [];
    for (const o of allOrders) {
      const oEmail = o.customerEmail.toLowerCase();
      const oFirstName = o.customerFirstName.toLowerCase();
      const oLastName = o.customerLastName.toLowerCase();

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
      email: snapshotOrders[0].customerEmail,
      phone: snapshotOrders[0].customerPhone,
      firstName: snapshotOrders[0].customerFirstName,
      lastName: snapshotOrders[0].customerLastName,
      orderCount: snapshotOrders.length,
      totalSpent: activeOrders.reduce((sum, o) => sum + o.total, 0),
      firstOrderDate: snapshotOrders[snapshotOrders.length - 1].createdAt,
      lastOrderDate: snapshotOrders[0].createdAt,
      hasAccount: false,
      accountId: null,
      mismatchFields: [],
      accountLogs: [],
      orders: snapshotOrders.map(mapOrder),
      similarCustomers,
    });
  } catch (error) {
    console.error("GET /api/admin/customers/[id] error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch customer", 500);
  }
}
