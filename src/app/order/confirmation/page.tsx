"use client";

import { Button } from "@/components/ui/Button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("number") || "—";
  const email = searchParams.get("email") || "";

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Thank you for your order!</h1>
      <p className="text-gray-600 mb-2">
        Your order number is:
      </p>
      <p className="text-2xl font-mono font-bold text-green-800 mb-4">
        {orderNumber}
      </p>
      {email && (
        <p className="text-sm text-gray-500 mb-8">
          Confirmation sent to {email}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={`/order/status?number=${orderNumber}&email=${encodeURIComponent(email)}`}>
          <Button variant="secondary">Track Order</Button>
        </Link>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-24 text-gray-500">Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
