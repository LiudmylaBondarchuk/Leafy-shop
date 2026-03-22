import { getSettings } from "@/lib/settings";
import { apiSuccess } from "@/lib/utils";

export async function GET() {
  const cfg = await getSettings();
  return apiSuccess({
    label: cfg["badge.featured.label"] || "Bestseller",
    color: cfg["badge.featured.color"] || "green",
  });
}
