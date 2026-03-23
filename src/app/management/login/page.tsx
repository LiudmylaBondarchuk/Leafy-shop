"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Leaf, FlaskConical, Shield } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ManagementLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"admin" | "tester">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [testerName, setTesterName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (json.data?.user) {
        if (json.data.mustChangePassword) {
          router.push("/management/change-password");
        } else {
          router.push("/management");
        }
      } else {
        setError(json.message || "Invalid email or password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTestPassword = async () => {
    setGenerating(true);
    setError("");
    setGeneratedPassword("");
    try {
      const res = await fetch("/api/auth/generate-test-password", { method: "POST" });
      const json = await res.json();
      if (json.data) {
        setEmail(json.data.email);
        setPassword(json.data.password);
        setGeneratedPassword(json.data.password);
        setTesterName(json.data.name || "");
        toast.success("Test password generated! Click Sign In to continue.");
      } else {
        setError(json.message || "Failed to generate test password");
      }
    } catch {
      setError("Failed to generate test password");
    } finally {
      setGenerating(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Email is required");
      return;
    }
    setForgotLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setForgotSent(true);
        toast.success("If the account exists, a reset email has been sent.");
      } else {
        setError(json.message || "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      {/* Theme toggle - top right */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Leaf className="h-8 w-8 text-green-700 dark:text-green-400" />
            <span className="text-2xl font-bold text-green-900 dark:text-green-300">Leafy</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Management Panel</p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode("admin"); setError(""); setGeneratedPassword(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
              mode === "admin"
                ? "bg-green-700 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <Shield className="h-4 w-4" />
            Admin / Manager
          </button>
          <button
            onClick={() => { setMode("tester"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
              mode === "tester"
                ? "bg-purple-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Tester
          </button>
        </div>

        {/* Admin/Manager login */}
        {mode === "admin" && !forgotMode && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <Input label="Email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            <Input label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(""); setForgotEmail(email); setForgotSent(false); }}
                className="text-sm text-green-700 dark:text-green-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* Forgot password form */}
        {mode === "admin" && forgotMode && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Check your email</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If an account with that email exists, we&apos;ve sent a temporary password. Use it to log in — you&apos;ll be asked to set a new password.
                </p>
                <Button onClick={() => { setForgotMode(false); setError(""); }} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Reset Password</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your email address and we&apos;ll send you a temporary password.
                </p>
                <Input label="Email" id="forgotEmail" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="your@email.com" />
                {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
                <Button type="submit" className="w-full" loading={forgotLoading}>Send Reset Email</Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setError(""); }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tester login */}
        {mode === "tester" && (
          <div className="space-y-4">
            {/* Info box */}
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-sm text-purple-800 dark:text-purple-300">
              <h3 className="font-semibold mb-2">Test Mode</h3>
              <p className="mb-2">You can log in with tester permissions. In test mode:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>All your changes (products, discounts, orders) are marked as test data</li>
                <li>Test data is not visible to store customers</li>
                <li>Test data is automatically cleaned up daily</li>
                <li>Your password is one-time — after logging out you need to generate a new one</li>
              </ul>
            </div>

            {/* Generate password */}
            {!generatedPassword ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Click to generate a one-time test password</p>
                <Button onClick={handleGenerateTestPassword} loading={generating} className="bg-purple-600 hover:bg-purple-700">
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Generate Test Password
                </Button>
                {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
                  <p className="text-green-800 dark:text-green-300 font-medium mb-1">Password generated!</p>
                  {testerName && <p className="text-green-700 dark:text-green-400">Account: <strong>{testerName}</strong></p>}
                  <p className="text-green-700 dark:text-green-400">Email: <code className="bg-green-100 dark:bg-green-900/50 px-1 rounded">{email}</code></p>
                  <p className="text-green-700 dark:text-green-400">Password: <code className="bg-green-100 dark:bg-green-900/50 px-1 rounded">{generatedPassword}</code></p>
                </div>
                <Input label="Email" id="testerEmail" type="email" value={email} disabled />
                <Input label="Password" id="testerPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" loading={loading}>Sign In as Tester</Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
