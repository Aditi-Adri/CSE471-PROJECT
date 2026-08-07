"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { RoleSelect } from "./RoleSelect";
import { authCardClasses, errorBannerClasses, inputClasses, primaryButtonClasses } from "./shared";
import { type PublicRole } from "@/lib/validation/authSchemas";

export function CompleteProfileForm() {
  const router = useRouter();
  const { update } = useSession();

  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<PublicRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, role }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    // Session callback re-reads the user from the DB on every check —
    // this just forces that re-read now instead of on the next
    // natural session poll, so /account shows the new role immediately.
    await update();
    router.push("/account");
    router.refresh();
  }

  return (
    <div className={`max-w-md ${authCardClasses}`}>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">One more step</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Tell us a bit more so we can set up your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && <p className={errorBannerClasses}>{error}</p>}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">I am a</span>
          <RoleSelect value={role} onChange={setRole} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Phone <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClasses}
            placeholder="+8801XXXXXXXXX"
          />
        </label>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
          {isSubmitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
