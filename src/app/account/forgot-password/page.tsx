"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        // Still show success to prevent email enumeration
        setSent(true);
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

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="h-8 w-8 text-green-700 dark:text-green-300" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Check your email
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent
              password reset instructions to that address.
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
              Forgot your password?
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Enter your email and we&apos;ll send you instructions to reset
              your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                error={error}
                placeholder="john@example.com"
              />

              <Button
                type="submit"
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                Send Reset Link
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
