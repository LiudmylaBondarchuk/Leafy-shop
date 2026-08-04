"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError("Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a digit.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(json.error || json.message || "This reset link is invalid or has expired.");
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

        {done ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Password updated</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You can now sign in with your new password.
            </p>
            <Link
              href="/account/login"
              className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-300 font-medium hover:text-green-800 dark:hover:text-green-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">Set a new password</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="At least 8 characters"
              />
              <Input
                label="Confirm new password"
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                placeholder="Re-enter new password"
                error={error || undefined}
              />
              <Button
                type="submit"
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                Update password
              </Button>
            </form>

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              <Link
                href="/account/login"
                className="inline-flex items-center gap-1 text-green-700 dark:text-green-300 font-medium hover:text-green-800 dark:hover:text-green-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
