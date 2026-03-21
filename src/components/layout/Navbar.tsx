"use client";

import Link from "next/link";
import { Leaf, ShoppingCart, Search, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);

  useEffect(() => setMounted(true), []);
  const cartItemCount = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  const navLinks = [
    { href: "/products?type=tea", label: "Teas" },
    { href: "/products?type=coffee", label: "Coffees" },
    { href: "/products", label: "All Products" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Leaf className="h-7 w-7 text-green-700 group-hover:text-green-800 transition-colors" />
            <span className="text-xl font-bold text-green-900">Leafy</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/products?type=tea" className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">
              Teas
            </Link>
            <Link href="/products?type=coffee" className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors">
              Coffees
            </Link>
            <Link href="/products" className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
              All Products
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <Link
              href="/products"
              className="p-2 rounded-lg text-gray-500 hover:text-green-700 hover:bg-gray-100 transition-colors"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg text-gray-500 hover:text-green-700 hover:bg-gray-100 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-200",
            mobileMenuOpen ? "max-h-48 pb-4" : "max-h-0"
          )}
        >
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
