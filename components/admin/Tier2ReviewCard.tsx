"use client";

import { useState } from "react";
import { errorBannerClasses, inputClasses, primaryButtonClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";

export type Tier2QueueItem = {
  workerId: string;
  preferredSchedule: string | null;
  worker: { headline: string; user: { name: string; email: string } };
};

export function Tier2ReviewCard({ item, onDecided }: { item: Tier2QueueItem; onDecided: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/verifications/tier2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: item.workerId, decision, evaluatorNote: note }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    onDecided();
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{item.worker.user.name}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {item.worker.user.email} · {item.worker.headline}
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Preferred schedule: {item.preferredSchedule || "Not specified"}
      </p>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Evaluator note (shown to the worker if failed)"
        className={`${inputClasses} mt-3`}
      />
      {error && <p className={`mt-2 ${errorBannerClasses}`}>{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => decide("APPROVED")} disabled={busy} className={primaryButtonClasses}>
          Passed
        </button>
        <button type="button" onClick={() => decide("REJECTED")} disabled={busy} className={secondaryButtonClasses}>
          Failed
        </button>
      </div>
    </div>
  );
}
