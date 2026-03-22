"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/constants/permissions";
import type { Role } from "@/constants/permissions";
import { Plus, Pencil, Shield, ShieldCheck, TestTube, KeyRound, Search, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/Skeleton";

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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resetModal, setResetModal] = useState<{ id: number; name: string; email: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<{ email: string; password: string } | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  const fetchUsers = () => {
    fetch("/api/admin/users")
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
    const res = await fetch(`/api/admin/users/${id}`, {
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

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    return true;
  });

  const hasFilters = search || roleFilter || statusFilter;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Link href="/management/users/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm w-full sm:w-56"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="tester">Tester</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); }} className="text-sm text-green-700 hover:text-green-800">
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{hasFilters ? "No users match your filters." : "No users found."}</div>
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
                {filtered.map((u: any) => {
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
                              onClick={() => setResetModal({ id: u.id, name: u.name, email: u.email })}
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

      {/* Reset password confirmation modal */}
      {resetModal && !generatedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!resetting) setResetModal(null); }}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-blue-100">
                <KeyRound className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Reset Password</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reset the password for <strong>{resetModal.name}</strong> ({resetModal.email})?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setResetModal(null)} disabled={resetting}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1" loading={resetting} onClick={async () => {
                setResetting(true);
                try {
                  const res = await fetch("/api/admin/users/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: resetModal.id }),
                  });
                  const json = await res.json();
                  if (json.data) {
                    setGeneratedPassword({ email: resetModal.email, password: json.data.password });
                  } else {
                    toast.error(json.message || "Failed to reset");
                    setResetModal(null);
                  }
                } catch {
                  toast.error("Failed to reset password");
                  setResetModal(null);
                } finally {
                  setResetting(false);
                }
              }}>
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generated password modal */}
      {generatedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-green-100">
                <KeyRound className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Password Reset Successful</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              New password for <strong>{generatedPassword.email}</strong>:
            </p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 mb-4">
              <code className="flex-1 text-sm font-mono font-medium text-gray-900 break-all">{generatedPassword.password}</code>
              <button
                onClick={() => copyToClipboard(generatedPassword.password)}
                className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 shrink-0"
                title="Copy password"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Make sure to save this password. It will not be shown again.</p>
            <Button size="sm" className="w-full" onClick={() => { setGeneratedPassword(null); setResetModal(null); }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
