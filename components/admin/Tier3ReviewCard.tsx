"use client";

import { useState } from "react";
import { errorBannerClasses, inputClasses, primaryButtonClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";

export type Tier3ReferenceItem = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  contacted: boolean;
  verified: boolean;
  note: string | null;
};

export type Tier3QueueItem = {
  workerId: string;
  clearanceDocument: string;
  worker: { headline: string; user: { name: string; email: string } };
  references: Tier3ReferenceItem[];
};

export function Tier3ReviewCard({ item, onDecided }: { item: Tier3QueueItem; onDecided: () => void }) {
  const [references, setReferences] = useState(item.references);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateReference(id: string, field: "contacted" | "verified", value: boolean) {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/verifications/tier3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: item.workerId,
        decision,
        reviewNote: note,
        referenceUpdates: references.map((r) => ({
          id: r.id,
          contacted: r.contacted,
          verified: r.verified,
          note: r.note ?? "",
        })),
      }),
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

      <div className="mt-3">
        <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Police clearance document</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, no next/image loader benefit here */}
        <img
          src={item.clearanceDocument}
          alt="Police clearance document"
          className="max-h-72 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
        />
      </div>

      <div className="mt-3">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">References</p>
        <div className="flex flex-col gap-2">
          {references.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-100 p-2 text-sm dark:border-zinc-800">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {r.name}{" "}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  — {r.relationship}, {r.phone}
                </span>
              </p>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={r.contacted}
                    onChange={(e) => updateReference(r.id, "contacted", e.target.checked)}
                  />
                  Contacted
                </label>
                <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={r.verified}
                    onChange={(e) => updateReference(r.id, "verified", e.target.checked)}
                  />
                  Verified
                </label>
              </div>
            </div>
          ))}
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
