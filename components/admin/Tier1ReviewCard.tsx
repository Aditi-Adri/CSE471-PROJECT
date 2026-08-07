"use client";

import { useState } from "react";
import { errorBannerClasses, inputClasses, primaryButtonClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";

export type Tier1QueueItem = {
  workerId: string;
  nidImage: string;
  selfieImage: string;
  matchDistance: number | null;
  autoApproved: boolean;
  worker: { headline: string; user: { name: string; email: string } };
};

export function Tier1ReviewCard({ item, onDecided }: { item: Tier1QueueItem; onDecided: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/verifications/tier1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: item.workerId, decision, reviewNote: note }),
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{item.worker.user.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {item.worker.user.email} · {item.worker.headline}
          </p>
        </div>
        {item.matchDistance !== null && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Distance {item.matchDistance.toFixed(3)} — {item.autoApproved ? "auto-passed" : "below threshold"}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">NID photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, no next/image loader benefit here */}
          <img
            src={item.nidImage}
            alt="Submitted NID"
            className="max-h-56 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Selfie</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, no next/image loader benefit here */}
          <img
            src={item.selfieImage}
            alt="Submitted selfie"
            className="max-h-56 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
          />
        </div>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (shown to the worker if rejected)"
        className={`${inputClasses} mt-3`}
      />
      {error && <p className={`mt-2 ${errorBannerClasses}`}>{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => decide("APPROVED")} disabled={busy} className={primaryButtonClasses}>
          Approve
        </button>
        <button type="button" onClick={() => decide("REJECTED")} disabled={busy} className={secondaryButtonClasses}>
          Reject
        </button>
      </div>
    </div>
  );
}
