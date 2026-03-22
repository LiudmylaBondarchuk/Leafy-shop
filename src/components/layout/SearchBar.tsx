"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productType: string;
  priceFrom: number;
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close on Escape, navigate on Enter
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          router.push(`/products/${results[activeIndex].slug}`);
          close();
        } else if (query.trim()) {
          router.push(`/products?search=${encodeURIComponent(query.trim())}`);
          close();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, results, activeIndex, query, router, close]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  const hasQuery = query.trim().length >= 2;
  const showNoResults = hasQuery && !loading && results.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-gray-500 hover:text-green-700 hover:bg-gray-100 transition-colors"
        aria-label="Search products"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex justify-center pt-20 px-4">
          <div
            ref={overlayRef}
            className="w-full max-w-lg h-fit bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                placeholder="Search products..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
              />
              {loading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin shrink-0" />}
              <button
                onClick={close}
                className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            {hasQuery && (
              <div className="max-h-80 overflow-y-auto">
                {results.map((product, index) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={close}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors ${
                      index === activeIndex ? "bg-green-50" : ""
                    }`}
                  >
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-300">
                          <Search className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{product.productType}</p>
                    </div>
                    <span className="text-sm font-medium text-green-700 shrink-0">
                      {formatPrice(product.priceFrom)}
                    </span>
                  </Link>
                ))}

                {showNoResults && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No results found for &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>
            )}

            {!hasQuery && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
