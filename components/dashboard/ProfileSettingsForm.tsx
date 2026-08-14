"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  cardClasses,
  errorBannerClasses,
  inputClasses,
  primaryButtonClasses,
  successBannerClasses,
} from "@/lib/ui/formStyles";
import { firstIssueMessage } from "@/lib/validation/formatZodIssues";

type ProfileSettingsFormProps = {
  initialName: string;
  initialPhone: string;
  initialAddress: string;
};

export function ProfileSettingsForm({ initialName, initialPhone, initialAddress }: ProfileSettingsFormProps) {
  const router = useRouter();
  const { update } = useSession();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(firstIssueMessage(data.issues, data.error ?? "Something went wrong. Please try again."));
      return;
    }

    setSuccess(true);
    // The session callback re-reads the user from the DB — this just
    // forces that now so the header/menu show the new name right away
    // instead of waiting for the next natural session poll.
    await update();
    router.refresh();
  }

  return (
    <div className={cardClasses}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Profile</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Your name, phone, and address — visible wherever the platform needs to reach you or send
        someone to your door.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && <p className={errorBannerClasses}>{error}</p>}
        {success && <p className={successBannerClasses}>Profile updated.</p>}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full name</span>
          <input
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
          />
        </label>

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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Address <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <textarea
            rows={2}
            maxLength={300}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClasses}
            placeholder='e.g. "House 12, Road 5, Dhanmondi — 3rd floor, blue gate"'
          />
          <span className="text-xs text-zinc-400">
            Only shown to the technician you&apos;ve booked, once the job is confirmed.
          </span>
        </label>

        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClasses} self-start`}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
