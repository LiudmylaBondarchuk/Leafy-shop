"use client";

import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, Minus, Plus, Trash2, Tag, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface CartCalculation {
  items: any[];
  subtotal: number;
  discount: { code: string; type: string; description: string; amount: number } | null;
  discountError?: string;
  shippingCost: number;
  total: number;
}

export default function CartPage() {
  const { items, discountCode, removeItem, updateQuantity, setDiscountCode } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [calculation, setCalculation] = useState<CartCalculation | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");

  useEffect(() => setMounted(true), []);

  const recalculate = useCallback(async () => {
    if (items.length === 0) {
      setCalculation(null);
      return;
    }
    try {
      const res = await fetch("/api/cart/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          discount_code: discountCode || undefined,
          shipping_method: "courier",
        }),
      });
      const json = await res.json();
      if (json.data) {
        setCalculation(json.data);
        if (json.data.discountError) {
          setCodeError(json.data.discountError);
        }
      }
    } catch {
      // ignore
    }
  }, [items, discountCode]);

  useEffect(() => {
    if (mounted) recalculate();
  }, [mounted, recalculate]);

  const handleApplyCode = async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError("");

    try {
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const res = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim(), cart_subtotal: subtotal }),
      });
      const json = await res.json();

      if (json.data?.valid) {
        setDiscountCode(codeInput.trim().toUpperCase());
        setCodeError("");
        toast.success(`Code ${codeInput.trim().toUpperCase()} applied!`);
      } else {
        setCodeError(json.data?.message || "Invalid discount code");
      }
    } catch {
      setCodeError("Failed to validate code");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleRemoveCode = () => {
    setDiscountCode(null);
    setCodeInput("");
    setCodeError("");
  };

  if (!mounted) {
    return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-500">Loading cart...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some products to get started.</p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const freeShippingRemaining = Math.max(0, 10000 - subtotal);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Items */}
        <div className="flex-1 space-y-4">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
            >
              {/* Image */}
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl shrink-0 ${
                item.productType === "tea" ? "bg-green-50" : "bg-amber-50"
              }`}>
                {item.productType === "tea" ? "🍵" : "☕"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.productSlug}`} className="font-medium text-gray-900 hover:text-green-700">
                  {item.productName}
                </Link>
                <p className="text-sm text-gray-500">{item.variantDesc}</p>
                <p className="text-sm font-medium text-green-800 mt-1">
                  {formatPrice(item.unitPrice)}
                </p>
              </div>

              {/* Quantity */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="p-1.5 hover:bg-gray-100 disabled:opacity-40 rounded-l-lg"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxStock}
                  className="p-1.5 hover:bg-gray-100 disabled:opacity-40 rounded-r-lg"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Line total */}
              <div className="text-right w-24 shrink-0">
                <p className="font-semibold text-gray-900">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>

              {/* Remove */}
              <button
                onClick={() => {
                  removeItem(item.variantId);
                  toast.info(`Removed ${item.productName} from cart`);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                aria-label={`Remove ${item.productName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

            {/* Discount code */}
            <div className="mb-4">
              {discountCode ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-700" />
                    <span className="text-sm font-medium text-green-700">{discountCode}</span>
                    {calculation?.discount && (
                      <span className="text-sm text-green-600">
                        ({calculation.discount.description})
                      </span>
                    )}
                  </div>
                  <button onClick={handleRemoveCode} className="text-green-700 hover:text-green-900">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => { setCodeInput(e.target.value); setCodeError(""); }}
                      placeholder="Discount code"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
                    />
                    <Button size="sm" variant="secondary" onClick={handleApplyCode} loading={codeLoading}>
                      Apply
                    </Button>
                  </div>
                  {codeError && <p className="text-xs text-red-600 mt-1">{codeError}</p>}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(calculation?.subtotal || subtotal)}</span>
              </div>

              {calculation?.discount && calculation.discount.amount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>-{formatPrice(calculation.discount.amount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {calculation?.shippingCost === 0 ? (
                    <span className="text-green-700">Free</span>
                  ) : (
                    formatPrice(calculation?.shippingCost || 1499)
                  )}
                </span>
              </div>

              {freeShippingRemaining > 0 && (
                <p className="text-xs text-gray-500 pt-1">
                  Add {formatPrice(freeShippingRemaining)} more for free shipping
                </p>
              )}

              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-green-800">
                    {formatPrice(calculation?.total || subtotal + 1499)}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout button */}
            <Link href="/checkout" className="block mt-6">
              <Button className="w-full" size="lg">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link
              href="/products"
              className="block text-center text-sm text-green-700 hover:text-green-800 mt-3"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
