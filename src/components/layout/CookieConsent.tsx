"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleChoice(choice: "accepted" | "declined") {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 animate-[slideUp_0.4s_ease-out]"
      style={{ "--tw-animate-slideUp": "slideUp" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-white/95 dark:bg-gray-800/95 p-4 shadow-lg backdrop-blur-sm sm:flex sm:items-center sm:gap-6 sm:p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 sm:flex-1">
            We use cookies to improve your experience. We store your cart
            locally and use essential cookies for authentication.{" "}
            <Link
              href="/privacy"
              className="font-medium text-green-700 underline underline-offset-2 hover:text-green-900"
            >
              Privacy Policy
            </Link>
          </p>

          <div className="mt-3 flex items-center gap-3 sm:mt-0 sm:shrink-0">
            <button
              onClick={() => handleChoice("declined")}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Decline
            </button>
            <button
              onClick={() => handleChoice("accepted")}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
