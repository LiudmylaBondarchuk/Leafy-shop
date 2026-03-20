import Link from "next/link";
import { Leaf, Truck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-green-900 text-green-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-6 w-6 text-green-400" />
              <span className="text-lg font-bold text-white">Leafy</span>
            </div>
            <p className="text-sm text-green-300">
              Premium teas and coffees from the best corners of the world.
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm text-green-300">
              <Truck className="h-4 w-4" />
              <span>Free shipping on orders over $100</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products?type=tea" className="text-sm text-green-300 hover:text-white transition-colors">
                  Teas
                </Link>
              </li>
              <li>
                <Link href="/products?type=coffee" className="text-sm text-green-300 hover:text-white transition-colors">
                  Coffees
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-sm text-green-300 hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Information</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/order/status" className="text-sm text-green-300 hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <span className="text-sm text-green-300">About Us</span>
              </li>
              <li>
                <span className="text-sm text-green-300">Contact</span>
              </li>
              <li>
                <span className="text-sm text-green-300">Terms & Conditions</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-green-800 mt-8 pt-6 text-center">
          <p className="text-xs text-green-400">
            &copy; {new Date().getFullYear()} Leafy. All rights reserved. This is a portfolio project.
          </p>
        </div>
      </div>
    </footer>
  );
}
