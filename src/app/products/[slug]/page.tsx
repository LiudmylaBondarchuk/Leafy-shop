"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { ProductImage } from "@/components/products/ProductImage";
import { BestsellerBadge } from "@/components/products/BestsellerBadge";
import { Button } from "@/components/ui/Button";
import { VariantSelector } from "@/components/products/VariantSelector";
import { GrindSelector } from "@/components/products/GrindSelector";
import { ProductCard } from "@/components/products/ProductCard";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, Minus, Plus, Thermometer, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useCartStore } from "@/store/cart-store";

interface Variant {
  id: number;
  weightGrams: number;
  grindType: string | null;
  price: number;
  comparePrice: number | null;
  sku: string;
  stock: number;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  imageUrl: string | null;
  productType: string;
  origin: string | null;
  brewTempMin: number | null;
  brewTempMax: number | null;
  brewTimeMin: number | null;
  brewTimeMax: number | null;
  flavorNotes: string | null;
  isFeatured: boolean;
  category: { id: number; name: string; slug: string };
  variants: Variant[];
  relatedProducts: any[];
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [selectedGrind, setSelectedGrind] = useState("");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const p = json.data;
          setProduct(p);
          // Set defaults
          if (p.variants.length > 0) {
            setSelectedWeight(p.variants[0].weightGrams);
            const grinds = p.variants.filter((v: Variant) => v.grindType).map((v: Variant) => v.grindType!);
            if (grinds.length > 0) {
              setSelectedGrind(grinds[0]);
            }
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  // Compute derived state (safe even when product is null)
  const grindsForWeight = product
    ? [...new Set(
        product.variants
          .filter((v) => v.weightGrams === selectedWeight && v.grindType)
          .map((v) => v.grindType!)
      )]
    : [];

  const effectiveGrind = grindsForWeight.includes(selectedGrind)
    ? selectedGrind
    : grindsForWeight[0] || "";

  const selectedVariant = product?.variants.find(
    (v) =>
      v.weightGrams === selectedWeight &&
      (product.productType === "tea" || !v.grindType
        ? true
        : v.grindType === effectiveGrind)
  );

  const maxQuantity = selectedVariant?.stock || 0;
  const isAvailable = maxQuantity > 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
        <Link href="/products" className="text-green-700 hover:text-green-800">
          Back to products
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    const weightLabel = selectedVariant.weightGrams >= 1000
      ? `${selectedVariant.weightGrams / 1000}kg`
      : `${selectedVariant.weightGrams}g`;
    const grindLabel = selectedVariant.grindType
      ? `, ${selectedVariant.grindType.replace("_", " ")}`
      : "";
    const variantDesc = `${weightLabel}${grindLabel}`;

    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.imageUrl,
      productType: product.productType,
      variantDesc,
      unitPrice: selectedVariant.price,
      quantity,
      maxStock: selectedVariant.stock,
    });

    toast.success(`Added ${product.name} (${variantDesc}) to cart`, {
      action: { label: "View Cart", onClick: () => window.location.href = "/cart" },
    });
  };

  const formatBrewTime = (seconds: number) => {
    if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
    return `${seconds}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/products" className="hover:text-green-700">Products</Link>
        {" / "}
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-green-700">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          productType={product.productType}
          className="rounded-2xl h-96 w-full"
        />

        {/* Info */}
        <div>
          <div className="flex gap-2 mb-3">
            <Badge>{product.category.name}</Badge>
            {product.isFeatured && <BestsellerBadge />}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

          {product.shortDescription && (
            <p className="text-gray-600 mb-4">{product.shortDescription}</p>
          )}

          {/* Price */}
          {selectedVariant && (
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-green-800">
                {formatPrice(selectedVariant.price)}
              </span>
              {selectedVariant.comparePrice && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(selectedVariant.comparePrice)}
                </span>
              )}
            </div>
          )}

          {/* Weight selector */}
          <div className="space-y-4 mb-6">
            <VariantSelector
              variants={product.variants}
              selectedWeight={selectedWeight}
              onWeightChange={(w) => {
                setSelectedWeight(w);
                setQuantity(1);
              }}
            />

            {/* Grind selector (coffee only) */}
            {product.productType === "coffee" && grindsForWeight.length > 0 && (
              <GrindSelector
                availableGrinds={grindsForWeight}
                selectedGrind={effectiveGrind}
                onGrindChange={setSelectedGrind}
              />
            )}
          </div>

          {/* Stock info */}
          <div className="mb-4">
            {!isAvailable ? (
              <p className="text-sm text-red-600 font-medium">Out of stock</p>
            ) : maxQuantity <= 5 ? (
              <p className="text-sm text-orange-600 font-medium">Only {maxQuantity} left!</p>
            ) : (
              <p className="text-sm text-green-600">In stock: {maxQuantity} units</p>
            )}
          </div>

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="p-2 hover:bg-gray-100 disabled:opacity-40 rounded-l-lg"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                className="p-2 hover:bg-gray-100 disabled:opacity-40 rounded-r-lg"
                title={quantity >= maxQuantity ? "Maximum available quantity" : ""}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              size="lg"
              className="flex-1"
              disabled={!isAvailable}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isAvailable ? "Add to Cart" : "Out of Stock"}
            </Button>
          </div>

          {/* Details */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            {product.origin && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>Origin: {product.origin}</span>
              </div>
            )}
            {product.brewTempMin && product.brewTempMax && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Thermometer className="h-4 w-4 text-gray-400" />
                <span>Brew temperature: {product.brewTempMin}–{product.brewTempMax}°C</span>
              </div>
            )}
            {product.brewTimeMin && product.brewTimeMax && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>Brew time: {formatBrewTime(product.brewTimeMin)}–{formatBrewTime(product.brewTimeMax)}</span>
              </div>
            )}
            {product.flavorNotes && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Flavor notes:</span> {product.flavorNotes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">About this product</h2>
        <p className="text-gray-600 leading-relaxed">{product.description}</p>
      </div>

      {/* Related products */}
      {product.relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-6">You might also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {product.relatedProducts.map((p: any) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <ProductImage
                  src={p.imageUrl}
                  alt={p.name}
                  productType={p.productType}
                  size="lg"
                  className="w-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-3">
                  <h3 className="font-medium text-sm text-gray-900 group-hover:text-green-700">{p.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
