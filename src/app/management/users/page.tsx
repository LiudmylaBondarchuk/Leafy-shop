"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/constants/permissions";
import type { Role } from "@/constants/permissions";
import { Plus, Pencil, Shield, ShieldCheck, TestTube, KeyRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const ROLE_ICONS: Record<string, any> = {
  admin: ShieldCheck,
  manager: Shield,
  tester: TestTube,
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  tester: "bg-purple-100 text-purple-800",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    fetch("/api/management/users")
      .then((r) => r.json())
      .then((json) => {
        setUsers(json.data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      if (json.data?.user) setCurrentUserId(Number(json.data.user.sub));
    });
  }, []);

  const handleToggleActive = async (id: number, name: string, activate: boolean) => {
    const res = await fetch(`/api/management/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: activate }),
    });
    const json = await res.json();
    if (json.data) {
      toast.success(`"${name}" ${activate ? "activated" : "deactivated"}`);
      fetchUsers();
    } else {
      toast.error(json.message || "Failed to update");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Link href="/management/users/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Permissions</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => {
                  const Icon = ROLE_ICONS[u.role] || Shield;
                  return (
                    <tr key={u.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!u.isActive ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-medium">
                            {u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={ROLE_COLORS[u.role] || ""}>
                          {ROLE_LABELS[u.role as Role] || u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.role === "admin" ? (
                          <span className="text-green-600">Full access</span>
                        ) : u.permissions.length > 0 ? (
                          <span>{u.permissions.length} permission{u.permissions.length !== 1 ? "s" : ""}</span>
                        ) : (
                          <span className="text-gray-300">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id === currentUserId ? (
                          <span className="text-xs text-gray-400">You</span>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Link href={`/management/users/${u.id}/edit`}>
                              <Button variant="ghost" size="sm" title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reset password"
                              onClick={async () => {
                                const res = await fetch("/api/management/users/reset-password", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId: u.id }),
                                });
                                const json = await res.json();
                                if (json.data) toast.success(`Password reset email sent to ${u.email}`);
                                else toast.error(json.message || "Failed to reset");
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(u.id, u.name, !u.isActive)}
                            >
                              <span className={`text-xs font-medium ${u.isActive ? "text-orange-500" : "text-green-600"}`}>
                                {u.isActive ? "Deactivate" : "Activate"}
                              </span>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
