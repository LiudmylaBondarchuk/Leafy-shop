import { apiSuccess, apiError } from "@/lib/utils";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { expireStalePendingOrders } from "@/lib/expire-pending-paypal";

// Daily safety-net cleanup for abandoned PayPal pending_payment orders.
// Primary cleanup happens opportunistically on every POST to /api/orders and PayPal endpoints,
// so this cron only matters for very low-traffic shops.
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

    const expired = await expireStalePendingOrders();
    if (expired > 0) revalidatePath("/", "layout");
    console.log(`[CRON] Expired ${expired} pending PayPal order(s)`);
    return apiSuccess({ expired });
  } catch (error) {
    console.error("[CRON] cleanup-pending-paypal error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Cleanup failed", 500);
  }
}
