"use client";

import { cn } from "@/lib/utils";

interface Variant {
  id: number;
  weightGrams: number;
  grindType: string | null;
  price: number;
  stock: number;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedWeight: number;
  onWeightChange: (weight: number) => void;
}

export function VariantSelector({ variants, selectedWeight, onWeightChange }: VariantSelectorProps) {
  // Get unique weights
  const weights = [...new Set(variants.map((v) => v.weightGrams))].sort((a, b) => a - b);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
      <div className="flex flex-wrap gap-2">
        {weights.map((weight) => {
          const weightVariant = variants.find((v) => v.weightGrams === weight);
          const isAvailable = weightVariant ? weightVariant.stock > 0 : false;
          const label = weight >= 1000 ? `${weight / 1000}kg` : `${weight}g`;

          return (
            <button
              key={weight}
              onClick={() => onWeightChange(weight)}
              disabled={!isAvailable}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                selectedWeight === weight
                  ? "bg-green-700 text-white border-green-700"
                  : isAvailable
                    ? "bg-white text-gray-700 border-gray-300 hover:border-green-600"
                    : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
