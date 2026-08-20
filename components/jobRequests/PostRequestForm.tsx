"use client";

import { useState } from "react";
import { DHAKA_AREAS } from "@/lib/constants/dhakaAreas";
import { inputClasses, primaryButtonClasses, errorBannerClasses, successBannerClasses } from "@/lib/ui/formStyles";

// The form a customer fills in when a search finds no matching
// category. Posts to /api/job-requests, and the request then shows up
// for workers browsing /dashboard/job-requests.
export function PostRequestForm({ initialDescription }: { initialDescription: string }) {
  const [description, setDescription] = useState(initialDescription);
  const [area, setArea] = useState("");
  const [budgetMinBdt, setBudgetMinBdt] = useState("");
  const [budgetMaxBdt, setBudgetMaxBdt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/job-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          area,
          budgetMinBdt: budgetMinBdt ? Number(budgetMinBdt) : undefined,
          budgetMaxBdt: budgetMaxBdt ? Number(budgetMaxBdt) : undefined,
        }),
      });

      if (res.status === 401) {
        setError("Please log in to post a request.");
        return;
      }
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
        Request posted — technicians browsing open requests can see it now.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        Post it as a request instead
      </p>

      {error && <p className={errorBannerClasses}>{error}</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">What do you need?</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={500}
          rows={3}
          className={inputClasses}
          placeholder="Describe the problem in a bit more detail..."
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Area</span>
        <select value={area} onChange={(e) => setArea(e.target.value)} required className={inputClasses}>
          <option value="" disabled>
            Select your neighborhood
          </option>
          {DHAKA_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Budget min (৳)</span>
          <input
            type="number"
            min={0}
            value={budgetMinBdt}
            onChange={(e) => setBudgetMinBdt(e.target.value)}
            className={inputClasses}
            placeholder="Optional"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Budget max (৳)</span>
          <input
            type="number"
            min={0}
            value={budgetMaxBdt}
            onChange={(e) => setBudgetMaxBdt(e.target.value)}
            className={inputClasses}
            placeholder="Optional"
          />
        </label>
      </div>

      <button type="submit" disabled={submitting} className={primaryButtonClasses}>
        {submitting ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}
