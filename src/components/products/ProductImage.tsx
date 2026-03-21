import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  productType?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-10 h-10 text-lg",
  md: "w-16 h-16 text-2xl",
  lg: "h-32 text-3xl",
  xl: "h-48 text-4xl",
};

export function ProductImage({ src, alt, productType = "tea", size = "lg", className }: ProductImageProps) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", sizes[size], className)}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-center",
      sizes[size],
      productType === "tea" ? "bg-green-50" : "bg-amber-50",
      className
    )}>
      {productType === "tea" ? "🍵" : "☕"}
    </div>
  );
}
