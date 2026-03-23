import { db } from "@/lib/db";
import { creditNotes } from "@/lib/db/schema-pg";
import { apiSuccess, apiError } from "@/lib/utils";
import { getAdminFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminFromCookie();
    if (!admin) return apiError("Unauthorized", 401);

    const allCreditNotes = await db.select().from(creditNotes);

    return apiSuccess({ creditNotes: allCreditNotes });
  } catch (error) {
    console.error("GET /api/credit-notes error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to fetch credit notes", 500);
  }
}
