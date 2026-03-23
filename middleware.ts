import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";

let _cachedMiddlewareSecret: Uint8Array | null = null;

function getMiddlewareSecret(): Uint8Array {
  if (_cachedMiddlewareSecret) return _cachedMiddlewareSecret;
  const raw = process.env.JWT_SECRET;
  if (!raw && !process.env.NEXT_PHASE) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  _cachedMiddlewareSecret = new TextEncoder().encode(raw || "");
  return _cachedMiddlewareSecret;
}

/**
 * Check if an admin/manager user must change their password.
 * Returns true if the user must be redirected to the change-password page.
 * Testers are excluded from this requirement.
 */
async function mustForcePasswordChange(userId: string): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return false; // SQLite fallback — let client-side guard handle it

  try {
    const sql = neon(dbUrl);
    const id = Number(userId);
    const rows = await sql`SELECT role, must_change_password FROM admin_users WHERE id = ${id} LIMIT 1`;
    if (rows.length === 0) return false;

    const { role, must_change_password } = rows[0];
    // Only enforce for admin and manager roles, NOT tester
    if (role === "tester") return false;
    return must_change_password === true;
  } catch (err) {
    console.error("middleware: failed to check mustChangePassword", err);
    return false; // fail open — client-side guard is the fallback
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page and public API
  if (pathname === "/management/login") return NextResponse.next();
  if (pathname === "/management/change-password") return NextResponse.next();
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (pathname.startsWith("/api/products")) return NextResponse.next();
  if (pathname.startsWith("/api/categories")) return NextResponse.next();
  if (pathname.startsWith("/api/cart/")) return NextResponse.next();
  if (pathname.startsWith("/api/discount-codes/validate")) return NextResponse.next();
  if (pathname.startsWith("/api/orders") && request.method === "POST" && !pathname.includes("/status")) return NextResponse.next();
  if (pathname.startsWith("/api/orders/status") && request.method === "GET") return NextResponse.next();
  if (pathname.startsWith("/api/orders/cancel")) return NextResponse.next();
  if (pathname.startsWith("/api/paypal/")) return NextResponse.next();
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();
  if (pathname.startsWith("/api/invoices/")) return NextResponse.next();
  if (pathname === "/api/health") return NextResponse.next();

  // Protect admin pages and admin API
  if (pathname.startsWith("/management") || pathname.startsWith("/api/admin")) {
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/management/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, getMiddlewareSecret());

      // For management pages (not API), check if admin/manager must change password
      if (pathname.startsWith("/management") && payload.sub) {
        const forceChange = await mustForcePasswordChange(payload.sub as string);
        if (forceChange) {
          return NextResponse.redirect(
            new URL("/management/change-password", request.url)
          );
        }
      }

      return NextResponse.next();
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid or expired token" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/management/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/management", "/management/:path*", "/api/admin/:path*"],
};
