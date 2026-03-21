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
    permissions: [] as string[],
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
    if (!userId && !form.password) { toast.error("Password is required"); return; }
    if (form.password && form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    setSaving(true);

    const payload: any = {
      name: form.name.trim(),
      role: form.role,
      permissions: form.role === "admin" ? [] : form.permissions,
      isActive: form.isActive,
    };

    if (!userId) {
      payload.email = form.email.trim().toLowerCase();
      payload.password = form.password;
    }
    if (form.password) payload.password = form.password;

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
        <div>
          <Input label={userId ? "New password (leave empty to keep)" : "Password *"} id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
        </div>
      </Card>

      {/* Role */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Role</h2>
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setForm({ ...form, role, permissions: role === "admin" ? [] : form.permissions })}
              className={`p-3 rounded-lg border text-center transition-colors ${
                form.role === role
                  ? "border-green-700 bg-green-50 text-green-800"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              <p className="font-medium text-sm">{ROLE_LABELS[role]}</p>
              <p className="text-xs mt-0.5 text-gray-400">
                {role === "admin" && "Full access"}
                {role === "manager" && "Custom access"}
                {role === "tester" && "Testing access"}
              </p>
            </button>
          ))}
        </div>

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
