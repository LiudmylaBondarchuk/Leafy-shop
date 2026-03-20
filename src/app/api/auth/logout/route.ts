import { deleteAuthCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/utils";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const cookie = deleteAuthCookie();
  cookieStore.set(cookie.name, cookie.value, cookie);
  return apiSuccess({ message: "Logged out" });
}
