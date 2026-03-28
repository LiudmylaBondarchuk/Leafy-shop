import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf, Coffee, Truck, Award, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-36 flex items-center gap-12">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">
              Teas & Coffees from the Best Corners of the World
            </h1>
            <p className="text-sm text-green-200 mb-5">
              Carefully selected, freshly packed, and delivered to your door.
            </p>
            <div className="flex gap-3">
              <Link href="/products">
                <Button size="md" className="bg-white text-green-900 hover:bg-green-50">
                  Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products?type=tea">
                <Button size="md" variant="ghost" className="text-white border border-white/30 hover:bg-white/10">
                  Explore Teas
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block shrink-0 relative w-64 h-40">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full border border-green-500/30" />
            <div className="absolute top-6 right-12 w-24 h-24 rounded-full border border-green-400/20" />
            <div className="absolute top-2 right-4 w-16 h-16 rounded-full bg-green-600/25" />
            <div className="absolute bottom-0 right-20 w-20 h-20 rounded-full border border-green-500/15" />
            <div className="absolute bottom-4 right-0 w-10 h-10 rounded-full bg-green-500/20" />
            {/* Icon accents */}
            <Leaf className="absolute top-4 right-6 h-10 w-10 text-green-400/40 -rotate-12" />
            <Coffee className="absolute bottom-4 right-20 h-8 w-8 text-green-400/35 rotate-12" />
            <Leaf className="absolute top-16 right-28 h-6 w-6 text-green-400/25 rotate-45" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg">
              <Truck className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Free Shipping</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">On orders over €100</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg">
              <Award className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Premium Quality</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Hand-picked selection</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg">
              <Shield className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Secure Checkout</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Safe & encrypted payments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
          Shop by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/products?type=tea"
            className="group relative overflow-hidden rounded-2xl h-64 hover:shadow-lg transition-shadow"
          >
            <Image
              src="https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Selection of premium teas"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-950/80 via-green-950/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8">
              <h3 className="text-2xl font-bold text-white mb-1">Teas</h3>
              <p className="text-green-200 mb-3 text-sm">Green, black, white, oolong & herbal</p>
              <span className="text-sm font-medium text-green-300 flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore teas <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
          <Link
            href="/products?type=coffee"
            className="group relative overflow-hidden rounded-2xl h-64 hover:shadow-lg transition-shadow"
          >
            <Image
              src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&h=400&fit=crop"
              alt="Fresh coffee beans"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-950/80 via-amber-950/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8">
              <h3 className="text-2xl font-bold text-white mb-1">Coffees</h3>
              <p className="text-amber-200 mb-3 text-sm">Single origin & specialty blends</p>
              <span className="text-sm font-medium text-amber-300 flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore coffees <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-50 dark:bg-green-900/30 border-y border-green-100 dark:border-green-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Ready to discover your new favorite?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
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
