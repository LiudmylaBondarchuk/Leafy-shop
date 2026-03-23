import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema-pg";
import { eq, and, isNull } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import crypto from "crypto";
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
    const { success, lockedUntil } = loginRateLimit(`admin-forgot:${ip}`);
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

    const { email } = await request.json();
    if (!email || !email.trim()) {
      return apiError("Email is required", 400, "VALIDATION_ERROR");
    }

    const user = await db.query.adminUsers.findFirst({
      where: and(
        eq(adminUsers.email, email.trim().toLowerCase()),
        eq(adminUsers.isActive, true),
        isNull(adminUsers.deletedAt),
      ),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return apiSuccess({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(12).toString("base64url").slice(0, 16);
    const passwordHash = hashSync(tempPassword, 12);

    await db.update(adminUsers).set({
      passwordHash,
      mustChangePassword: true,
    }).where(eq(adminUsers.id, user.id));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";

    if (resend) {
      try {
        await resend.emails.send({
          from: "Leafy <noreply@leafyshop.eu>",
          to: user.email,
          subject: "Password Reset — Leafy Management",
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#1a4d1a;padding:24px;text-align:center;border-radius:12px 12px 0 0">
                <h1 style="color:white;margin:0;font-size:24px">Leafy Management</h1>
              </div>
              <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none">
                <h2 style="color:#1a4d1a;margin-top:0">Password Reset</h2>
                <p>Hi ${escapeHtml(user.name)},</p>
                <p>A password reset was requested for your admin account. Here is your temporary password:</p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
                  <code style="font-size:18px;font-weight:bold;color:#15803d">${tempPassword}</code>
                </div>
                <p>Use this password to <a href="${appUrl}/management/login" style="color:#15803d;font-weight:600">log in</a>. You will be asked to set a new password after logging in.</p>
                <p style="color:#666;font-size:13px">If you didn't request this, please contact the administrator immediately.</p>
              </div>
              <div style="padding:16px;text-align:center;font-size:12px;color:#999;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
                <p style="margin:0">Leafy Tea & Coffee &middot; leafyshop.eu</p>
              </div>
            </div>
          `,
        });
      } catch (error) {
        console.error("[EMAIL] Failed to send admin reset email:", error instanceof Error ? error.message : "Unknown error");
      }
    }

    return apiSuccess({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to process request", 500);
  }
}
