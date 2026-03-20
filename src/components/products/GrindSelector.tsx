"use client";

import { cn } from "@/lib/utils";

const GRIND_LABELS: Record<string, string> = {
  whole_bean: "Whole Bean",
  fine: "Fine Ground",
  medium: "Medium Ground",
  coarse: "Coarse Ground",
  espresso: "Espresso",
};

interface GrindSelectorProps {
  availableGrinds: string[];
  selectedGrind: string;
  onGrindChange: (grind: string) => void;
}

export function GrindSelector({ availableGrinds, selectedGrind, onGrindChange }: GrindSelectorProps) {
  if (availableGrinds.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Grind</label>
      <div className="flex flex-wrap gap-2">
        {availableGrinds.map((grind) => (
          <button
            key={grind}
            onClick={() => onGrindChange(grind)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              selectedGrind === grind
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-700 border-gray-300 hover:border-green-600"
            )}
          >
            {GRIND_LABELS[grind] || grind}
          </button>
        ))}
      </div>
    </div>
  );
}
