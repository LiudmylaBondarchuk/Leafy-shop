import Link from "next/link";
import { ArrowRight, Leaf, Coffee, Truck, Award, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white">
        <div className="absolute inset-0 bg-[url('/images/hero/pattern.svg')] opacity-5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Leaf className="h-8 w-8 text-green-400" />
              <span className="text-green-300 font-medium">Premium Selection</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Teas & Coffees from the Best Corners of the World
            </h1>
            <p className="text-lg text-green-200 mb-8 max-w-lg">
              Carefully selected, freshly packed, and delivered to your door. Discover flavors
              that will transform your daily ritual.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products">
                <Button size="lg" className="bg-white text-green-900 hover:bg-green-50">
                  Browse Products
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/products?type=tea">
                <Button size="lg" variant="ghost" className="text-white hover:bg-green-700/50">
                  Explore Teas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Truck className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Free Shipping</p>
              <p className="text-sm text-gray-500">On orders over $100</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Premium Quality</p>
              <p className="text-sm text-gray-500">Hand-picked selection</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Secure Checkout</p>
              <p className="text-sm text-gray-500">Safe & encrypted payments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Shop by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/products?type=tea"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-8 h-64 flex flex-col justify-end hover:shadow-lg transition-shadow"
          >
            <Leaf className="absolute top-6 right-6 h-24 w-24 text-green-200 group-hover:text-green-300 transition-colors" />
            <h3 className="text-2xl font-bold text-green-900 mb-2">Teas</h3>
            <p className="text-green-700 mb-4">Green, black, white, oolong & herbal</p>
            <span className="text-sm font-medium text-green-700 flex items-center gap-1 group-hover:gap-2 transition-all">
              Explore teas <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            href="/products?type=coffee"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-8 h-64 flex flex-col justify-end hover:shadow-lg transition-shadow"
          >
            <Coffee className="absolute top-6 right-6 h-24 w-24 text-amber-200 group-hover:text-amber-300 transition-colors" />
            <h3 className="text-2xl font-bold text-amber-900 mb-2">Coffees</h3>
            <p className="text-amber-700 mb-4">Single origin & specialty blends</p>
            <span className="text-sm font-medium text-amber-700 flex items-center gap-1 group-hover:gap-2 transition-all">
              Explore coffees <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-50 border-y border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to discover your new favorite?
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Browse our full collection of premium teas and coffees, sourced from the finest estates worldwide.
          </p>
          <Link href="/products">
            <Button size="lg">
              View All Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
