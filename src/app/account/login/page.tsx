"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Please enter a valid email address";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (res.ok && json.data) {
        toast.success("Welcome back!");
        router.push("/account");
        router.refresh();
      } else {
        const msg = json.message || "Invalid email or password";
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
          Log in to your account
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Welcome back! Please enter your details.
        </p>

        {errors.form && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3 mb-4">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
            error={errors.email}
            placeholder="john@example.com"
          />

          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: "" }));
            }}
            error={errors.password}
            placeholder="Enter your password"
          />

          <div className="flex justify-end">
            <Link
              href="/account/forgot-password"
              className="text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={submitting}
            disabled={submitting}
          >
            Log In
          </Button>
        </form>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/account/register"
            className="text-green-700 dark:text-green-300 font-medium hover:text-green-800 dark:hover:text-green-200 transition-colors"
          >
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
