"use client";

import { DiscountForm } from "@/components/admin/DiscountForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminEditDiscountPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/management/discounts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Discount Code</h1>
      </div>
      <DiscountForm discountId={parseInt(id)} />
    </div>
  );
}
