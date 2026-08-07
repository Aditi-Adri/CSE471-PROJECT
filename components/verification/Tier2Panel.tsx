"use client";

import { useState } from "react";
import { errorBannerClasses, inputClasses, primaryButtonClasses } from "@/lib/ui/formStyles";
import { TierStatusCard } from "./TierStatusCard";

type Tier2Status = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  evaluatorNote: string | null;
} | null;

export function Tier2Panel({
  status,
  unlocked,
  canSubmit,
  onSubmitted,
}: {
  status: Tier2Status;
  unlocked: boolean;
  canSubmit: boolean;
  onSubmitted: () => void;
}) {
  const [preferredSchedule, setPreferredSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!unlocked) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-4 opacity-60 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-500 dark:text-zinc-500">Tier 2 · Practical Skills Test</h3>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">Complete Tier 1 first to unlock this.</p>
      </div>
    );
  }

  if (status && !canSubmit) {
    return (
      <TierStatusCard
        title="Tier 2 · Practical Skills Test"
        status={status.status}
        note={status.evaluatorNote}
        extra={
          status.status === "PENDING"
            ? "A coordinator will contact you to schedule your practical test."
            : undefined
        }
      />
    );
  }

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/verification/tier2/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredSchedule }),
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    onSubmitted();
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Tier 2 · Practical Skills Test</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        A platform coordinator evaluates a hands-on skills test in person. Request one below.
      </p>

      {status?.status === "REJECTED" && (
        <p className={`mt-3 ${errorBannerClasses}`}>
          You didn&apos;t pass last time{status.evaluatorNote ? `: ${status.evaluatorNote}` : "."} You can request
          another attempt.
        </p>
      )}

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preferred schedule / location <span className="font-normal text-zinc-400">(optional)</span>
        </span>
        <input
          value={preferredSchedule}
          onChange={(e) => setPreferredSchedule(e.target.value)}
          className={inputClasses}
          placeholder='e.g. "Weekday mornings, Gulshan area"'
        />
      </label>

      {error && <p className={`mt-3 ${errorBannerClasses}`}>{error}</p>}

      <button
        type="button"
        onClick={handleRequest}
        disabled={submitting}
        className={`${primaryButtonClasses} mt-4 w-full sm:w-auto`}
      >
        {submitting ? "Requesting…" : "Request skills test"}
      </button>
    </div>
  );
}
