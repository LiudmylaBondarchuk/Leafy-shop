"use client";

import { ProductForm } from "@/components/admin/ProductForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminNewProductPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/management/products" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
      </div>
      <ProductForm />
    </div>
  );
}
