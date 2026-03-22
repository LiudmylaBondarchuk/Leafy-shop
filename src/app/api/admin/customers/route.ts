import { db } from "@/lib/db";
import { orders, customers as customersTable } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";

interface CustomerRecord {
  id: string; // composite key
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

export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const search = request.nextUrl.searchParams.get("search") || "";

    // Use SQL aggregation instead of loading all orders into memory
    const aggregated = await db
      .select({
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        customerFirstName: orders.customerFirstName,
        customerLastName: orders.customerLastName,
        orderCount: sql<number>`count(*)`.as("order_count"),
        totalSpent: sql<number>`coalesce(sum(case when ${orders.status} not in ('cancelled', 'returned') then ${orders.total} else 0 end), 0)`.as("total_spent"),
        lastOrderDate: sql<string>`max(${orders.createdAt})`.as("last_order_date"),
      })
      .from(orders)
      .groupBy(
        orders.customerEmail,
        orders.customerFirstName,
        orders.customerLastName,
        orders.customerPhone,
      );

    // Build customer records
    const customers: CustomerRecord[] = [];

    for (const row of aggregated) {
      const key = `${row.customerEmail.toLowerCase()}|${row.customerFirstName.toLowerCase()}|${row.customerLastName.toLowerCase()}|${row.customerPhone}`;

      customers.push({
        id: Buffer.from(key).toString("base64url"),
        email: row.customerEmail,
        phone: row.customerPhone,
        firstName: row.customerFirstName,
        lastName: row.customerLastName,
        orderCount: Number(row.orderCount),
        totalSpent: Number(row.totalSpent),
        lastOrderDate: row.lastOrderDate,
        lastOrderNumber: "", // filled below
        hasAccount: false,
        accountId: null,
        similarCustomers: [],
      });
    }

    // Fetch last order number for each customer (one query for the latest order per group)
    // We use a lightweight lookup: get orders sorted by createdAt desc, then match
    const latestOrders = await db
      .select({
        customerEmail: orders.customerEmail,
        customerFirstName: orders.customerFirstName,
        customerLastName: orders.customerLastName,
        customerPhone: orders.customerPhone,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(sql`${orders.createdAt} desc`);

    const assignedKeys = new Set<string>();
    for (const o of latestOrders) {
      const key = `${o.customerEmail.toLowerCase()}|${o.customerFirstName.toLowerCase()}|${o.customerLastName.toLowerCase()}|${o.customerPhone}`;
      if (assignedKeys.has(key)) continue;
      assignedKeys.add(key);

      const customer = customers.find((c) => c.id === Buffer.from(key).toString("base64url"));
      if (customer) {
        customer.lastOrderNumber = o.orderNumber;
      }
    }

    // Detect similar customers using Maps for O(n) lookup
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
      const emailKey = c.email.toLowerCase();
      const sameEmail = emailMap.get(emailKey) || [];
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

    // Match with customer accounts + add registered customers without orders
    const allAccounts = await db.select({
      id: customersTable.id,
      email: customersTable.email,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      phone: customersTable.phone,
      deletedAt: customersTable.deletedAt,
      createdAt: customersTable.createdAt,
    }).from(customersTable);

    const accountMap = new Map<string, number>();
    for (const a of allAccounts) {
      if (!(a as any).deletedAt) accountMap.set((a.email as string).toLowerCase(), a.id as number);
    }
    for (const c of customers) {
      const accId = accountMap.get(c.email.toLowerCase());
      if (accId !== undefined) {
        c.hasAccount = true;
        c.accountId = accId;
      }
    }

    // Add registered customers who have no orders yet
    for (const a of allAccounts) {
      if ((a as any).deletedAt) continue;
      const emailLower = (a.email as string).toLowerCase();
      const alreadyExists = customers.some((c) => c.email.toLowerCase() === emailLower);
      if (!alreadyExists) {
        const key = `${emailLower}|${(a.firstName as string).toLowerCase()}|${(a.lastName as string).toLowerCase()}|${a.phone || ""}`;
        customers.push({
          id: Buffer.from(key).toString("base64url"),
          email: a.email as string,
          phone: (a.phone as string) || "",
          firstName: a.firstName as string,
          lastName: a.lastName as string,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: a.createdAt as string,
          lastOrderNumber: "",
          hasAccount: true,
          accountId: a.id as number,
          similarCustomers: [],
        });
      }
    }

    // Filter by search
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

    // Sort by last order date (newest first)
    filtered.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));

    return apiSuccess(filtered);
  } catch (error) {
    console.error("GET /api/admin/customers error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch customers", 500);
  }
}
