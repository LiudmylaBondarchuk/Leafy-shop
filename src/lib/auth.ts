import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (!raw && process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
    console.warn("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(raw || "leafy-shop-dev-secret-key-32chars!!");
}

const SECRET = getJwtSecret();

const COOKIE_NAME = "admin_token";

export async function signToken(payload: { sub: number; email: string; name: string }) {
  return new SignJWT({ ...payload, sub: String(payload.sub) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as { sub: number; email: string; name: string };
  } catch {
    return null;
  }
}

export async function getAdminFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function createAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  };
}

export function deleteAuthCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  };
}
