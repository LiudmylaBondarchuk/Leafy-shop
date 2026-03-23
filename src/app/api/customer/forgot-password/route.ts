import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { apiSuccess, apiError } from "@/lib/utils";
import { loginRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success, lockedUntil } = loginRateLimit(`customer-forgot:${ip}`);
    if (!success) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many attempts. Account locked for 5 minutes.",
          lockedUntil,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return apiError("Email is required", 400, "VALIDATION_ERROR");
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.email, email.trim().toLowerCase()),
    });

    // Always return success to avoid email enumeration
    if (!customer) {
      return apiSuccess({ message: "If an account with that email exists, a reset link has been sent." });
    }

    const resetToken = randomBytes(32).toString("hex"); // 64 hex chars
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    await db.update(customers).set({
      resetToken,
      resetTokenExpiry,
      updatedAt: new Date().toISOString(),
    }).where(eq(customers.id, customer.id));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";
    const resetLink = `${appUrl}/account/reset-password?token=${resetToken}`;

    if (resend) {
      try {
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
                <p>We received a request to reset your password. Click the link below to set a new one:</p>
                <p style="text-align:center;margin:24px 0">
                  <a href="${resetLink}" style="display:inline-block;background:#15803d;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
                </p>
                <p style="color:#666;font-size:13px">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
              </div>
              <div style="padding:16px;text-align:center;font-size:12px;color:#999;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <p style="margin:0">Leafy Tea & Coffee · leafyshop.eu</p>
              </div>
            </div>
          `,
        });
        console.log("[EMAIL] Password reset sent to", customer.email.slice(0, 3) + "***");
      } catch (error) {
        console.error("[EMAIL] Failed to send password reset email:", error instanceof Error ? error.message : "Unknown error");
      }
    } else {
      console.log("[EMAIL] Resend not configured — reset email sent for", customer.email.slice(0, 3) + "***");
    }

    return apiSuccess({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("POST /api/customer/forgot-password error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to process request", 500);
  }
}
