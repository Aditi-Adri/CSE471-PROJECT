"use client";

import { useState } from "react";
import {
  cardClasses,
  errorBannerClasses,
  inputClasses,
  primaryButtonClasses,
  successBannerClasses,
} from "@/lib/ui/formStyles";
import { firstIssueMessage } from "@/lib/validation/formatZodIssues";

/**
 * Doubles as "change password" and "set a password" — a Google-only
 * account has no `passwordHash` yet, so there's nothing to confirm
 * before setting one. `hasPassword` starts from the server-rendered
 * session and flips locally the moment a first password is set, so
 * the form doesn't ask for a "current password" that didn't exist a
 * second ago.
 */
export function PasswordSettingsForm({ hasPassword: initialHasPassword }: { hasPassword: boolean }) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(firstIssueMessage(data.issues, data.error ?? "Something went wrong. Please try again."));
      return;
    }

    setSuccess(data.message ?? "Password updated.");
    setHasPassword(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className={cardClasses}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {hasPassword ? "Change password" : "Set a password"}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {hasPassword
          ? "Update the password you use to sign in."
          : "You signed up with Google — add a password so you can also log in with your email."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && <p className={errorBannerClasses}>{error}</p>}
        {success && <p className={successBannerClasses}>{success}</p>}

        {hasPassword && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClasses}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New password</span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClasses}
            placeholder="At least 8 characters, a letter and a number"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm new password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClasses}
          />
        </label>

        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClasses} self-start`}>
          {isSubmitting ? "Saving…" : hasPassword ? "Update password" : "Set password"}
        </button>
      </form>
    </div>
  );
}
