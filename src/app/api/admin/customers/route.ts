import { db } from "@/lib/db";
import { orders, customers as customersTable } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { authorize } from "@/lib/require-permission";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

type OrderRow = typeof orders.$inferSelect;

interface CustomerRecord {
  id: string; // composite key (base64url)
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  lastOrderNumber: string;
  hasAccount: boolean;
  accountId: number | null;
  similarCustomers: { id: string; email: string; firstName: string; lastName: string; reason: string }[];
}

const isActive = (o: OrderRow) => !["cancelled", "returned", "pending_payment"].includes(o.status);

export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const denied = await authorize("customers.view");
  if (denied) return denied;

  try {
    const search = request.nextUrl.searchParams.get("search") || "";

    const allOrders: OrderRow[] = await db.select().from(orders);
    const allAccounts = await db
      .select({
        id: customersTable.id,
        email: customersTable.email,
        firstName: customersTable.firstName,
        lastName: customersTable.lastName,
        phone: customersTable.phone,
        deletedAt: customersTable.deletedAt,
        createdAt: customersTable.createdAt,
      })
      .from(customersTable);

    const accountsById = new Map<number, typeof allAccounts[number]>();
    const accountsByEmail = new Map<string, typeof allAccounts[number]>();
    for (const a of allAccounts) {
      if (a.deletedAt) continue;
      accountsById.set(a.id, a);
      accountsByEmail.set(a.email.toLowerCase(), a);
    }

    // An order is owned by an account via its customerId link, or (fallback) via
    // a matching email — the same rule the customer-facing side uses.
    const ownerAccount = (o: OrderRow) => {
      if (o.customerId && accountsById.has(o.customerId)) return accountsById.get(o.customerId)!;
      return accountsByEmail.get(o.customerEmail.toLowerCase()) ?? null;
    };

    // Bucket orders: one bucket per account, or per snapshot identity for guests.
    interface Bucket {
      orders: OrderRow[];
      account: typeof allAccounts[number] | null;
      snapshot: { email: string; firstName: string; lastName: string; phone: string } | null;
    }
    const buckets = new Map<string, Bucket>();

    for (const o of allOrders) {
      const acc = ownerAccount(o);
      const bucketKey = acc
        ? `acct:${acc.id}`
        : `snap:${o.customerEmail.toLowerCase()}|${o.customerFirstName.toLowerCase()}|${o.customerLastName.toLowerCase()}|${o.customerPhone}`;
      let b = buckets.get(bucketKey);
      if (!b) {
        b = {
          orders: [],
          account: acc,
          snapshot: acc ? null : { email: o.customerEmail, firstName: o.customerFirstName, lastName: o.customerLastName, phone: o.customerPhone },
        };
        buckets.set(bucketKey, b);
      }
      b.orders.push(o);
    }

    const customers: CustomerRecord[] = [];
    const accountsWithOrders = new Set<number>();

    for (const b of buckets.values()) {
      const sorted = [...b.orders].sort((a, z) => z.createdAt.localeCompare(a.createdAt));
      const last = sorted[0];
      const totalSpent = b.orders.filter(isActive).reduce((sum, o) => sum + o.total, 0);

      if (b.account) {
        accountsWithOrders.add(b.account.id);
        customers.push({
          id: Buffer.from(`account|${b.account.id}`).toString("base64url"),
          email: b.account.email,
          phone: b.account.phone || "",
          firstName: b.account.firstName,
          lastName: b.account.lastName,
          orderCount: b.orders.length,
          totalSpent,
          lastOrderDate: last.createdAt,
          lastOrderNumber: last.orderNumber,
          hasAccount: true,
          accountId: b.account.id,
          similarCustomers: [],
        });
      } else {
        const s = b.snapshot!;
        const key = `${s.email.toLowerCase()}|${s.firstName.toLowerCase()}|${s.lastName.toLowerCase()}|${s.phone}`;
        customers.push({
          id: Buffer.from(key).toString("base64url"),
          email: s.email,
          phone: s.phone,
          firstName: s.firstName,
          lastName: s.lastName,
          orderCount: b.orders.length,
          totalSpent,
          lastOrderDate: last.createdAt,
          lastOrderNumber: last.orderNumber,
          hasAccount: false,
          accountId: null,
          similarCustomers: [],
        });
      }
    }

    // Registered accounts that have no orders at all.
    for (const a of accountsById.values()) {
      if (accountsWithOrders.has(a.id)) continue;
      customers.push({
        id: Buffer.from(`account|${a.id}`).toString("base64url"),
        email: a.email,
        phone: a.phone || "",
        firstName: a.firstName,
        lastName: a.lastName,
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: a.createdAt,
        lastOrderNumber: "",
        hasAccount: true,
        accountId: a.id,
        similarCustomers: [],
      });
    }

    // Detect look-alikes (same email or phone, different details) across records.
    const emailMap = new Map<string, CustomerRecord[]>();
    const phoneMap = new Map<string, CustomerRecord[]>();
    for (const c of customers) {
      const emailKey = c.email.toLowerCase();
      if (!emailMap.has(emailKey)) emailMap.set(emailKey, []);
      emailMap.get(emailKey)!.push(c);
      if (c.phone) {
        if (!phoneMap.has(c.phone)) phoneMap.set(c.phone, []);
        phoneMap.get(c.phone)!.push(c);
      }
    }

    for (const c of customers) {
      const sameEmail = emailMap.get(c.email.toLowerCase()) || [];
      for (const other of sameEmail) {
        if (c.id === other.id) continue;
        if (c.firstName !== other.firstName || c.lastName !== other.lastName) {
          if (!c.similarCustomers.some((s) => s.id === other.id)) {
            c.similarCustomers.push({ id: other.id, email: other.email, firstName: other.firstName, lastName: other.lastName, reason: "Same email, different name" });
          }
        }
      }
      if (c.phone) {
        const samePhone = phoneMap.get(c.phone) || [];
        for (const other of samePhone) {
          if (c.id === other.id) continue;
          if (c.similarCustomers.some((s) => s.id === other.id)) continue;
          if (c.email.toLowerCase() !== other.email.toLowerCase()) {
            c.similarCustomers.push({ id: other.id, email: other.email, firstName: other.firstName, lastName: other.lastName, reason: "Same phone, different email" });
          } else if (c.firstName !== other.firstName || c.lastName !== other.lastName) {
            c.similarCustomers.push({ id: other.id, email: other.email, firstName: other.firstName, lastName: other.lastName, reason: "Same phone, different name" });
          }
        }
      }
    }

    let filtered = customers;
    if (search) {
      const q = search.toLowerCase();
      filtered = customers.filter((c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    }

    filtered.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));

    return apiSuccess(filtered);
  } catch (error) {
    console.error("GET /api/admin/customers error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch customers", 500);
  }
}
