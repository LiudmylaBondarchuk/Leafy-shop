import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) {
    return apiError("Not authenticated", 401, "UNAUTHORIZED");
  }
  return apiSuccess({ user: admin });
}
