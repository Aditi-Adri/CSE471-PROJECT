"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authCardClasses, errorBannerClasses, inputClasses, primaryButtonClasses, successBannerClasses } from "./shared";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <div className={`max-w-sm text-center ${authCardClasses}`}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This reset link is missing its token.{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-sm ${authCardClasses}`}>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Set a new password</h1>

      {done ? (
        <p className={`mt-6 ${successBannerClasses}`}>Password updated. Redirecting you to log in…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && <p className={errorBannerClasses}>{error}</p>}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
              placeholder="At least 8 characters, 1 letter & 1 number"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm new password</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClasses}
              placeholder="Re-enter your password"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
