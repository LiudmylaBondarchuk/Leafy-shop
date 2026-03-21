import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "leafy-shop-dev-secret-key-32chars!!"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page and public API
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/admin/change-password") return NextResponse.next();
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (pathname.startsWith("/api/products")) return NextResponse.next();
  if (pathname.startsWith("/api/categories")) return NextResponse.next();
  if (pathname.startsWith("/api/cart/")) return NextResponse.next();
  if (pathname.startsWith("/api/discount-codes/validate")) return NextResponse.next();
  if (pathname.startsWith("/api/orders") && request.method === "POST" && !pathname.includes("/status")) return NextResponse.next();
  if (pathname.startsWith("/api/orders/status") && request.method === "GET") return NextResponse.next();
  if (pathname.startsWith("/api/orders/cancel")) return NextResponse.next();
  if (pathname.startsWith("/api/paypal/")) return NextResponse.next();
  if (pathname.startsWith("/api/invoices/")) return NextResponse.next();
  if (pathname === "/api/health") return NextResponse.next();

  // Protect admin pages and admin API
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid or expired token" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
