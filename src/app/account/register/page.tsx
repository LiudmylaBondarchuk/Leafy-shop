"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2)
      errs.firstName = "First name must be at least 2 characters";
    if (!form.lastName.trim() || form.lastName.trim().length < 2)
      errs.lastName = "Last name must be at least 2 characters";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Please enter a valid email address";
    if (!form.password || form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      errs.password = "Password must contain uppercase, lowercase and a number";
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        }),
      });
      const json = await res.json();

      if (res.ok && json.data) {
        toast.success("Account created successfully!");
        window.location.href = "/account";
      } else {
        const msg = json.message || "Registration failed";
        setErrors({ form: msg });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Leaf className="h-7 w-7 text-green-700 dark:text-green-300" />
          <span className="text-xl font-bold text-green-900 dark:text-green-300">Leafy</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          Create an account
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Join Leafy to track your orders and enjoy a faster checkout.
        </p>

        {errors.form && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3 mb-4">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First name *"
              id="firstName"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              error={errors.firstName}
              placeholder="John"
              maxLength={100}
            />
            <Input
              label="Last name *"
              id="lastName"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              error={errors.lastName}
              placeholder="Smith"
              maxLength={100}
            />
          </div>

          <Input
            label="Email *"
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            error={errors.email}
            placeholder="john@example.com"
            maxLength={255}
          />

          <Input
            label="Phone (optional)"
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="123456789"
          />

          <div>
            <Input
              label="Password *"
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              error={errors.password}
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Min. 8 characters, at least one uppercase letter, one lowercase letter, and one number.
            </p>
          </div>

          <Input
            label="Confirm password *"
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            error={errors.confirmPassword}
            placeholder="Re-enter your password"
          />

          <Button
            type="submit"
            className="w-full"
            loading={submitting}
            disabled={submitting}
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="text-green-700 dark:text-green-300 font-medium hover:text-green-800 dark:hover:text-green-200 transition-colors"
          >
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
