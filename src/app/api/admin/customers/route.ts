import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

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

    const allOrders: any[] = await db.select().from(orders);

    // Group by unique combination: email + firstName + lastName + phone
    const customerMap = new Map<string, CustomerRecord>();

    for (const o of allOrders) {
      const key = `${o.customerEmail.toLowerCase()}|${o.customerFirstName.toLowerCase()}|${o.customerLastName.toLowerCase()}|${o.customerPhone}`;

      if (customerMap.has(key)) {
        const existing = customerMap.get(key)!;
        existing.orderCount++;
        existing.totalSpent += ["cancelled", "returned"].includes(o.status) ? 0 : o.total;
        if (o.createdAt > existing.lastOrderDate) {
          existing.lastOrderDate = o.createdAt;
          existing.lastOrderNumber = o.orderNumber;
        }
      } else {
        customerMap.set(key, {
          id: Buffer.from(key).toString("base64url"),
          email: o.customerEmail,
          phone: o.customerPhone,
          firstName: o.customerFirstName,
          lastName: o.customerLastName,
          orderCount: 1,
          totalSpent: ["cancelled", "returned"].includes(o.status) ? 0 : o.total,
          lastOrderDate: o.createdAt,
          lastOrderNumber: o.orderNumber,
          similarCustomers: [],
        });
      }
    }

    // Detect similar customers (same email or same phone but different name)
    const customers = Array.from(customerMap.values());

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
