import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

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

    // Detect similar customers (same email or same phone but different name)
    for (const c of customers) {
      for (const other of customers) {
        if (c.id === other.id) continue;

        let reason = "";
        if (c.email.toLowerCase() === other.email.toLowerCase() && (c.firstName !== other.firstName || c.lastName !== other.lastName)) {
          reason = "Same email, different name";
        } else if (c.phone === other.phone && c.email.toLowerCase() !== other.email.toLowerCase()) {
          reason = "Same phone, different email";
        } else if (c.phone === other.phone && (c.firstName !== other.firstName || c.lastName !== other.lastName)) {
          reason = "Same phone, different name";
        }

        if (reason && !c.similarCustomers.some((s) => s.id === other.id)) {
          c.similarCustomers.push({
            id: other.id,
            email: other.email,
            firstName: other.firstName,
            lastName: other.lastName,
            reason,
          });
        }
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
    console.error("GET /api/admin/customers error:", error);
    return apiError("Failed to fetch customers", 500);
  }
}
