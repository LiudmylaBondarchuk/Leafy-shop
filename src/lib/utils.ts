import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(priceInCents: number, currency = "€"): string {
  return `${currency}${(priceInCents / 100).toFixed(2)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json(
    { error: code || "SERVER_ERROR", message },
    { status }
  );
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Unambiguous alphabet: no 0/o/1/l/i — avoids confusion when customer reads the number over the phone.
const ORDER_SUFFIX_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomSuffix(length = 5): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ORDER_SUFFIX_ALPHABET[bytes[i] % ORDER_SUFFIX_ALPHABET.length];
  }
  return out;
}

export function generateOrderNumber(date: Date, sequence: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `LEA-${y}${m}${d}-${seq}-${randomSuffix()}`;
}

// Full order number format: LEA-YYYYMMDD-NNNN-xxxxx (4 dash-segments).
// The final segment is a random access suffix we keep out of user-facing UI —
// it lives in URLs so the enumerate-by-sequence attack stays blocked.
export function formatOrderNumber(fullNumber: string): string {
  const parts = fullNumber.split("-");
  if (parts.length >= 4 && parts[0] === "LEA") {
    return parts.slice(0, 3).join("-");
  }
  return fullNumber;
}
