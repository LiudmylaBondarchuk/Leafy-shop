import { getSettings } from "@/lib/settings";
import { apiSuccess } from "@/lib/utils";

export async function GET() {
  const settings = await getSettings();
  const vatRate = parseInt(settings["store.vat_rate"] || "23", 10);
  return apiSuccess({ vatRate });
}
