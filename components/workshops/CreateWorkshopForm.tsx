"use client";

import { useState } from "react";
import { inputClasses, primaryButtonClasses, errorBannerClasses, successBannerClasses } from "@/lib/ui/formStyles";

// The admin's form to create a new workshop or training programme.
// Calls onCreated() after a successful save, so the list next to it
// can refetch and show the new workshop.
export function CreateWorkshopForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [feeBdt, setFeeBdt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Only send a fee if this workshop is actually paid.
    let feeToSend = undefined;
    if (isPaid) {
      feeToSend = Number(feeBdt);
    }

    try {
      const res = await fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          scheduledAt: new Date(scheduledAt).toISOString(),
          isPaid,
          feeBdt: feeToSend,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setIsPaid(false);
      setFeeBdt("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create a workshop</p>

      {error && <p className={errorBannerClasses}>{error}</p>}
      {success && <p className={successBannerClasses}>Workshop created — it&apos;s now open for registration.</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={150}
          className={inputClasses}
          placeholder="e.g. Basic Electrical Safety Training"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          className={inputClasses}
          placeholder="What this workshop covers, who it's for..."
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Date &amp; time</span>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
          className={inputClasses}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={isPaid}
          onChange={(e) => setIsPaid(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-600 dark:border-zinc-600 dark:bg-zinc-800"
        />
        This is a paid workshop
      </label>

      {isPaid && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Fee (৳)</span>
          <input
            type="number"
            min={1}
            value={feeBdt}
            onChange={(e) => setFeeBdt(e.target.value)}
            required
            className={`${inputClasses} max-w-xs`}
            placeholder="e.g. 500"
          />
        </label>
      )}

      <button type="submit" disabled={submitting} className={primaryButtonClasses}>
        {submitting ? "Creating…" : "Create workshop"}
      </button>
    </form>
  );
}
