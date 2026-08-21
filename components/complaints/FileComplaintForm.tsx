"use client";

import { useState } from "react";
import { inputClasses, primaryButtonClasses, secondaryButtonClasses, errorBannerClasses, successBannerClasses } from "@/lib/ui/formStyles";

// A small "File a complaint" button on a worker's profile page.
// Clicking it opens a short form; submitting posts to /api/complaints.
// An admin reviews it from /admin/complaints.
export function FileComplaintForm({ workerId }: { workerId: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId, subject, description }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p className={successBannerClasses}>
        Complaint filed — see /dashboard/complaints for the admin&apos;s reply once it&apos;s reviewed.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-400 dark:hover:text-red-400"
      >
        🚩 File a complaint against this worker
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      {error && <p className={errorBannerClasses}>{error}</p>}

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          maxLength={150}
          className={`${inputClasses} py-1.5 text-xs`}
          placeholder="What's this about?"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">What happened</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          className={`${inputClasses} text-xs`}
          placeholder="Describe the issue..."
        />
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={`${primaryButtonClasses} mt-0 px-3 py-1.5 text-xs`}>
          {submitting ? "Submitting…" : "Submit complaint"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`${secondaryButtonClasses} px-3 py-1.5 text-xs`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
