import Link from "next/link";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ManagementNotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <Leaf className="h-16 w-16 text-green-200 mb-6" />
      <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Page not found</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        This management page doesn't exist.
      </p>
      <Link href="/management">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
