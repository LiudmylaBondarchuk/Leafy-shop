const COLOR_MAP: Record<string, { bg: string; star: string }> = {
  green: { bg: "bg-green-100 text-green-800 border-green-300", star: "text-amber-500" },
  amber: { bg: "bg-amber-100 text-amber-800 border-amber-300", star: "text-amber-600" },
  blue: { bg: "bg-blue-100 text-blue-800 border-blue-300", star: "text-blue-500" },
  purple: { bg: "bg-purple-100 text-purple-800 border-purple-300", star: "text-purple-500" },
  red: { bg: "bg-red-100 text-red-800 border-red-300", star: "text-red-500" },
  pink: { bg: "bg-pink-100 text-pink-800 border-pink-300", star: "text-pink-500" },
};

export function BestsellerBadge({ label, color }: { label?: string; color?: string }) {
  const c = COLOR_MAP[color || "green"] || COLOR_MAP.green;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={c.star}>★</span>
      {label || "Bestseller"}
    </span>
  );
}

export function OutOfStockBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Out of stock
    </span>
  );
}
