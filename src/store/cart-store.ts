"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const CART_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface CartItem {
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string | null;
  productType: string;
  variantDesc: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

interface CartStore {
  items: CartItem[];
  discountCode: string | null;
  lastUpdated: number | null;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  setDiscountCode: (code: string | null) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
  checkExpiry: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discountCode: null,
      lastUpdated: null,

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.maxStock) }
                  : i
              ),
              lastUpdated: Date.now(),
            };
          }
          return { items: [...state.items, newItem], lastUpdated: Date.now() };
        }),

      removeItem: (variantId) =>
        set((state) => {
          const newItems = state.items.filter((i) => i.variantId !== variantId);
          return {
            items: newItems,
            lastUpdated: newItems.length > 0 ? Date.now() : null,
          };
        }),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
              : i
          ),
          lastUpdated: Date.now(),
        })),

      setDiscountCode: (code) => set({ discountCode: code }),

      clearCart: () => set({ items: [], discountCode: null, lastUpdated: null }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

      checkExpiry: () => {
        const { lastUpdated, items } = get();
        if (items.length > 0 && lastUpdated && Date.now() - lastUpdated > CART_EXPIRY_MS) {
          set({ items: [], discountCode: null, lastUpdated: null });
        }
      },
    }),
    {
      name: "leafy-cart",
    }
  )
);
