import { getSettings } from "@/lib/settings";
import { apiSuccess } from "@/lib/utils";

type BadgeItem = { id: string; name: string; color: string };

export async function GET() {
  const cfg = await getSettings();

  // Parse full badge list from store.badges JSON
  let badges: BadgeItem[] = [];
  try {
    const raw = cfg["store.badges"];
    if (raw) badges = JSON.parse(raw) as BadgeItem[];
  } catch { /* ignore */ }

  // Fallback: if no badges stored yet, derive from legacy keys
  if (badges.length === 0) {
    badges = [
      {
        id: "featured",
        name: cfg["badge.featured.label"] || "Bestseller",
        color: cfg["badge.featured.color"] || "green",
      },
    ];
  }

  // Also return the featured badge separately for backward compatibility
  const featured = badges.find((b) => b.id === "featured") || badges[0];

  return apiSuccess({
    label: featured.name,
    color: featured.color,
    badges,
    gtmId: cfg["store.gtm_id"] || "",
    ga4Id: cfg["store.ga4_id"] || "",
    fbPixelId: cfg["store.fb_pixel_id"] || "",
  });
}
