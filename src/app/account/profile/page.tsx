"use client";

import { useEffect, useState } from "react";
import { User, Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [form, setForm] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    phone: "",
    street: "",
    city: "",
    zip: "",
    country: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/customer/me");
        if (res.ok) {
          const json = await res.json();
          const data = json.data?.customer;
          if (data) {
            setForm({
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              phone: data.phone || "",
              street: data.shippingStreet || "",
              city: data.shippingCity || "",
              zip: data.shippingZip || "",
              country: data.shippingCountry || "",
            });
          }
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const updatePasswordField = (field: string, value: string) => {
    setPasswordForm((f) => ({ ...f, [field]: value }));
    setPasswordErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2)
      errs.firstName = "First name must be at least 2 characters";
    if (!form.lastName.trim() || form.lastName.trim().length < 2)
      errs.lastName = "Last name must be at least 2 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePassword = () => {
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword)
      errs.currentPassword = "Current password is required";
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8)
      errs.newPassword = "New password must be at least 8 characters";
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          shippingStreet: form.street.trim() || undefined,
          shippingCity: form.city.trim() || undefined,
          shippingZip: form.zip.trim() || undefined,
          shippingCountry: form.country.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
      } else {
        const json = await res.json();
        toast.error(json.message || "Failed to update profile");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setChangingPassword(true);
    try {
      const res = await fetch("/api/customer/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password changed successfully");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const json = await res.json();
        toast.error(json.message || "Failed to change password");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-green-700" />
          Personal Information
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First name *"
              id="firstName"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              error={errors.firstName}
              placeholder="John"
            />
            <Input
              label="Last name *"
              id="lastName"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              error={errors.lastName}
              placeholder="Smith"
            />
          </div>

          <Input
            label="Phone"
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="123456789"
          />

          <hr className="border-gray-200 dark:border-gray-700" />

          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Shipping Address</h3>

          <Input
            label="Street & number"
            id="street"
            value={form.street}
            onChange={(e) => updateField("street", e.target.value)}
            placeholder="123 Tea Street, Apt 4"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Warsaw"
            />
            <Input
              label="Zip code"
              id="zip"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              placeholder="00-001"
            />
          </div>

          <Input
            label="Country"
            id="country"
            value={form.country}
            onChange={(e) => updateField("country", e.target.value)}
            placeholder="PL"
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving} disabled={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-green-700" />
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current password *"
            id="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
            error={passwordErrors.currentPassword}
            placeholder="Enter current password"
          />

          <Input
            label="New password *"
            id="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => updatePasswordField("newPassword", e.target.value)}
            error={passwordErrors.newPassword}
            placeholder="At least 8 characters"
          />

          <Input
            label="Confirm new password *"
            id="confirmPassword"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => updatePasswordField("confirmPassword", e.target.value)}
            error={passwordErrors.confirmPassword}
            placeholder="Re-enter new password"
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              loading={changingPassword}
              disabled={changingPassword}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Delete Account */}
      <Card className="p-5 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h2 className="font-semibold text-red-900 dark:text-red-300">Delete Account</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Permanently delete your account. Your order history will be preserved but your personal data and login will be removed. This action cannot be undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
            const res = await fetch("/api/customer/delete-account", { method: "POST" });
            const json = await res.json();
            if (json.data) {
              toast.success("Account deleted");
              window.location.href = "/";
            } else {
              toast.error(json.message || "Failed to delete account");
            }
          }}
        >
          Delete My Account
        </Button>
      </Card>
    </div>
  );
}
