import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { Resend } from "resend";

import { NextRequest } from "next/server";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("Account ID is required", 400);

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, parseInt(id)),
  });
  if (!customer) return apiError("Customer not found", 404);

  return apiSuccess({
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone || "",
    shippingStreet: customer.shippingStreet || "",
    shippingCity: customer.shippingCity || "",
    shippingZip: customer.shippingZip || "",
    shippingCountry: customer.shippingCountry || "PL",
  });
}

export async function PUT(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const { accountId, firstName, lastName, email, phone, shippingStreet, shippingCity, shippingZip, shippingCountry } = body;

    if (!accountId) return apiError("Account ID is required", 400);

    const existing = await db.select().from(customers).where(eq(customers.id, accountId));
    if (existing.length === 0) return apiError("Customer account not found", 404);

    // If email changed, check for duplicates
    if (email && email.trim().toLowerCase() !== existing[0].email.toLowerCase()) {
      const duplicate = await db.query.customers.findFirst({
        where: eq(customers.email, email.trim().toLowerCase()),
      });
      if (duplicate) return apiError("Another customer already uses this email", 409);
    }

    await db
      .update(customers)
      .set({
        firstName: firstName ?? existing[0].firstName,
        lastName: lastName ?? existing[0].lastName,
        email: email ? email.trim().toLowerCase() : existing[0].email,
        phone: phone ?? existing[0].phone,
        shippingStreet: shippingStreet ?? existing[0].shippingStreet,
        shippingCity: shippingCity ?? existing[0].shippingCity,
        shippingZip: shippingZip ?? existing[0].shippingZip,
        shippingCountry: shippingCountry ?? existing[0].shippingCountry,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customers.id, accountId));

    return apiSuccess({ id: accountId });
  } catch (error) {
    console.error("PUT /api/admin/customers/account error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to update customer account", 500);
  }
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) return apiError("Account ID is required", 400);

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, accountId),
    });
    if (!customer) return apiError("Customer account not found", 404);

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour for admin-triggered

    await db.update(customers).set({
      resetToken,
      resetTokenExpiry,
      updatedAt: new Date().toISOString(),
    }).where(eq(customers.id, accountId));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";
    const resetLink = `${appUrl}/account/reset-password?token=${resetToken}`;

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (resend) {
      await resend.emails.send({
        from: "Leafy <noreply@leafyshop.eu>",
        to: customer.email,
        subject: "Reset Your Password — Leafy",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1a4d1a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
              <h1 style="color:white;margin:0;font-size:24px">Leafy</h1>
            </div>
            <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none">
              <h2 style="color:#1a4d1a;margin-top:0">Reset Your Password</h2>
              <p>Hi ${escapeHtml(customer.firstName)},</p>
              <p>An administrator has requested a password reset for your account. Click the link below to set a new password:</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${resetLink}" style="display:inline-block;background:#15803d;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
              </p>
              <p style="color:#666;font-size:13px">This link expires in 1 hour. If you didn't expect this, contact support.</p>
            </div>
            <div style="padding:16px;text-align:center;font-size:12px;color:#999;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
              <p style="margin:0">Leafy Tea & Coffee · leafyshop.eu</p>
            </div>
          </div>
        `,
      });
    }

    return apiSuccess({ message: "Password reset link sent to " + customer.email });
  } catch (error) {
    console.error("POST /api/admin/customers/account error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to send reset link", 500);
  }
}
