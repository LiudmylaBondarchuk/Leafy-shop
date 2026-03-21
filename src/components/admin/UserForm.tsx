"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ALL_PERMISSIONS, getPermissionGroups, ROLES, ROLE_LABELS } from "@/constants/permissions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UserFormProps {
  userId?: number;
}

export function UserForm({ userId }: UserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager" as "admin" | "manager" | "tester",
    permissions: ["products.view", "orders.view", "discounts.view", "customers.view"] as string[],
    isActive: true,
  });

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setForm({
            name: json.data.name,
            email: json.data.email,
            password: "",
            role: json.data.role,
            permissions: json.data.permissions || [],
            isActive: json.data.isActive,
          });
        }
        setLoading(false);
      });
  }, [userId]);

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (userId && form.password && form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    setSaving(true);

    const payload: any = {
      name: form.name.trim(),
      role: form.role,
      permissions: form.role === "admin" ? [] : form.permissions,
      isActive: form.isActive,
    };

    if (!userId) {
      payload.email = form.email.trim().toLowerCase();
    }
    if (userId && form.password) payload.password = form.password;

    try {
      const url = userId ? `/api/admin/users/${userId}` : "/api/admin/users";
      const method = userId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();

      if (json.data) {
        toast.success(userId ? "User updated" : "User created");
        router.push("/admin/users");
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  const permissionGroups = getPermissionGroups();

  return (
    <div className="max-w-2xl space-y-6">
      {/* Basic info */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Account Details</h2>
        <Input label="Name *" id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
        <Input label="Email *" id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@leafy.pl" disabled={!!userId} />
        {!userId && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            A strong password will be generated automatically and sent to the user's email.
            They will be required to change it on first login.
          </p>
        )}
        {userId && (
          <Input label="New password (leave empty to keep current)" id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
        )}
      </Card>

      {/* Role */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Role</h2>
        <div>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as any, permissions: e.target.value === "admin" ? [] : form.permissions })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>
        </div>

        {/* Role description */}
        {form.role === "admin" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <strong>Admin</strong> — Full access to all system features. Manages users, products, orders, and store configuration. Permissions cannot be restricted.
          </div>
        )}
        {form.role === "manager" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Manager</strong> — Access to selected features based on granted permissions. Cannot manage admin accounts or grant permissions they don't have.
          </div>
        )}
        {form.role === "tester" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
            <strong>Tester</strong> — Account for testing the store. All data created by testers (products, discounts, orders) is marked as test data and not visible to customers. Test data is automatically cleaned up. Access limited based on granted permissions.
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
          <span className="text-sm text-gray-700">Active account</span>
        </label>
      </Card>

      {/* Permissions (only for manager/tester) */}
      {form.role !== "admin" && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Permissions</h2>
          <p className="text-xs text-gray-400">Select what this user can access and do.</p>

          {Object.entries(permissionGroups).map(([group, perms]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{group}</h3>
              <div className="space-y-1.5 pl-1">
                {perms.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      className="rounded border-gray-300 text-green-700 focus:ring-green-600"
                    />
                    <span className="text-sm text-gray-600">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setForm({ ...form, permissions: ALL_PERMISSIONS.map((p) => p.key) })} className="text-xs text-green-700 hover:text-green-800">
              Select all
            </button>
            <span className="text-xs text-gray-300">|</span>
            <button onClick={() => setForm({ ...form, permissions: [] })} className="text-xs text-gray-500 hover:text-gray-700">
              Clear all
            </button>
          </div>
        </Card>
      )}

      {form.role === "admin" && (
        <Card className="p-5 bg-green-50 border-green-200">
          <p className="text-sm text-green-800">
            <strong>Admin</strong> has full access to all features. No individual permissions needed.
          </p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push("/admin/users")}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>
          {userId ? "Save Changes" : "Create User"}
        </Button>
      </div>
    </div>
  );
}
