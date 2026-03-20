import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, cn } from "@/lib/utils";

interface ProductCardProps {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  imageUrl?: string | null;
  productType: string;
  category: { name: string; slug: string };
  priceFrom: number;
  isFeatured: boolean;
  inStock: boolean;
}

export function ProductCard({
  name, slug, shortDescription, imageUrl, productType, category, priceFrom, isFeatured, inStock,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className={cn(
        "group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all",
        !inStock && "opacity-60"
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={cn(
            "h-full flex items-center justify-center text-4xl",
            productType === "tea" ? "bg-green-50" : "bg-amber-50"
          )}>
            {productType === "tea" ? "🍵" : "☕"}
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Badges */}
        <div className="flex gap-1.5 mb-2 flex-wrap">
          <Badge variant="default">{category.name}</Badge>
          {isFeatured && <Badge variant="success">Bestseller</Badge>}
          {!inStock && <Badge variant="error">Out of stock</Badge>}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-1">
          {name}
        </h3>

        {/* Description */}
        {shortDescription && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{shortDescription}</p>
        )}

        {/* Price */}
        <p className="text-lg font-bold text-green-800">
          from {formatPrice(priceFrom)}
        </p>
      </div>
    </Link>
  );
}
