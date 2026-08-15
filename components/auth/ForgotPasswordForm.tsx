"use client";

import Link from "next/link";
import { useState } from "react";
import { authCardClasses, errorBannerClasses, inputClasses, primaryButtonClasses, successBannerClasses } from "./shared";
import { firstIssueMessage } from "@/lib/validation/formatZodIssues";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(firstIssueMessage(data.issues, data.error ?? "Something went wrong. Please try again."));
      return;
    }

    setMessage(data.message);
  }

  return (
    <div className={`max-w-sm ${authCardClasses}`}>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Reset your password</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {message ? (
        <p className={`mt-6 ${successBannerClasses}`}>{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && <p className={errorBannerClasses}>{error}</p>}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
              placeholder="you@example.com"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to login
        </Link>
      </p>
    </div>
  );
}
