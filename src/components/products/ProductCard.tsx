import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ProductImage } from "@/components/products/ProductImage";
import { BestsellerBadge, OutOfStockBadge } from "@/components/products/BestsellerBadge";
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
      <ProductImage
        src={imageUrl}
        alt={name}
        productType={productType}
        size="xl"
        className="w-full group-hover:scale-105 transition-transform duration-300"
      />

      <div className="p-4">
        <div className="flex gap-1.5 mb-2 flex-wrap">
          <Badge variant="default">{category.name}</Badge>
          {isFeatured && <BestsellerBadge />}
          {!inStock && <OutOfStockBadge />}
        </div>

        <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors mb-1">
          {name}
        </h3>

        {shortDescription && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{shortDescription}</p>
        )}

        <p className="text-lg font-bold text-green-800">
          from {formatPrice(priceFrom)}
        </p>
      </div>
    </Link>
  );
}
