import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";
import { runTestDataCleanup } from "@/lib/cleanup-test-data";

// This endpoint is called by an external cron service (e.g., Vercel Cron, GitHub Actions)
// Protected by a secret token in the query string or Authorization header

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.CRON_SECRET;
    if (!expectedToken) {
      console.error("[CRON] CRON_SECRET env var not set");
      return apiError("Server configuration error", 500);
    }

    if (token !== expectedToken) {
      return apiError("Invalid cron token", 401, "UNAUTHORIZED");
    }

    const summary = await runTestDataCleanup();
    console.log("[CRON] Test data cleanup:", summary);
    return apiSuccess(summary);
  } catch (error) {
    console.error("[CRON] Cleanup error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Cleanup failed", 500);
  }
}
