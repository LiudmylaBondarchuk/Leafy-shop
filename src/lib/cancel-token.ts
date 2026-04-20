import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET environment variable is required");
  return raw;
}

export function generateCancelToken(orderNumber: string, email: string): string {
  const payload = `${orderNumber.trim()}|${email.trim().toLowerCase()}|cancel`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function verifyCancelToken(orderNumber: string, email: string, token: string): boolean {
  if (typeof token !== "string" || token.length !== 64) return false;
  const expected = generateCancelToken(orderNumber, email);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
