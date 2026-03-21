"use client";

import { UserForm } from "@/components/admin/UserForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminEditUserPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
      </div>
      <UserForm userId={parseInt(id)} />
    </div>
  );
}
