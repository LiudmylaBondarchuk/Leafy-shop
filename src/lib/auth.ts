import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

let _cachedSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (_cachedSecret) return _cachedSecret;
  const raw = process.env.JWT_SECRET;
  if (!raw && !process.env.NEXT_PHASE) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  _cachedSecret = new TextEncoder().encode(raw || "");
  return _cachedSecret;
}

const COOKIE_NAME = "admin_token";

export async function signToken(payload: { sub: number; email: string; name: string }) {
  return new SignJWT({ ...payload, sub: String(payload.sub) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
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
