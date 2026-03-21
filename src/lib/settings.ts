import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema-pg";

const DEFAULTS: Record<string, string> = {
  "store.name": "Leafy Tea & Coffee Ltd.",
  "store.address": "5 Leafy Lane, Warsaw, Poland",
  "store.phone": "",
  "store.email": "support@leafyshop.eu",
  "email.orders_from": "orders@leafyshop.eu",
  "email.invoices_from": "invoices@leafyshop.eu",
  "email.noreply_from": "noreply@leafyshop.eu",
};

let cache: { data: Record<string, string>; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  try {
    const rows = await db.select().from(settings);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      map[row.key] = row.value;
    }
    cache = { data: map, ts: Date.now() };
    return map;
  } catch {
    return { ...DEFAULTS };
  }
}

export function getSetting(all: Record<string, string>, key: string): string {
  return all[key] || DEFAULTS[key] || "";
}
