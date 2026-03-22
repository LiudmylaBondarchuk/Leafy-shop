import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getCustomerSecret() {
  const raw = process.env.CUSTOMER_JWT_SECRET;
  if (!raw && process.env.NODE_ENV === "production" && typeof window === "undefined" && !process.env.NEXT_PHASE) {
    console.warn("CUSTOMER_JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(raw || "customer-secret-change-me");
}

const CUSTOMER_SECRET = getCustomerSecret();

const COOKIE_NAME = "customer_token";

export interface CustomerPayload {
  sub: number;
  email: string;
  firstName: string;
  lastName: string;
}

export async function signCustomerToken(payload: CustomerPayload) {
  return new SignJWT({ ...payload, sub: String(payload.sub) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(CUSTOMER_SECRET);
}

export async function verifyCustomerToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_SECRET);
    return payload as unknown as CustomerPayload;
  } catch {
    return null;
  }
}

export async function getCustomerFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

export function createCustomerCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  };
}

export function deleteCustomerCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  };
}
