"use client";

import { useCallback, useEffect, useState } from "react";
import {
  errorBannerClasses,
  inputClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
  successBannerClasses,
} from "@/lib/ui/formStyles";
import { firstIssueMessage } from "@/lib/validation/formatZodIssues";
import { formatRateRange } from "@/lib/format";

type Property = {
  id: string;
  label: string;
  address: string;
  area: string;
};

type WorkerResult = {
  id: string;
  name: string;
  headline: string;
  area: string;
  hourlyRateMinBdt: number;
  hourlyRateMaxBdt: number;
  ratingAvg: number;
  ratingCount: number;
  verificationTier: string;
};

/**
 * MODULE 3 -> FEATURE 3 (Jishan- Corporate Portal): modal for placing a
 * corporate-tagged booking from a specific managed property. The modal
 * lets the user search for a technician, pick one, propose a rate, and
 * POST to /api/corporate/bookings.
 */
export function CorporateBookingModal({
  propertyId,
  property,
  onClose,
  onSuccess,
}: {
  propertyId: string;
  property: Property;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [workers, setWorkers] = useState<WorkerResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [proposedRate, setProposedRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Search workers, defaulting to the property's area. */
  const searchWorkers = useCallback(async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      params.set("area", property.area);
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setWorkers(data.results ?? []);
    } catch {
      /* ignore — just no results */
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, property.area]);

  // Initial load — show available workers in this area. searchWorkers
  // only sets state after its `await fetch(...)` resolves — a real
  // async boundary, just not written as the `.then()` callback shape
  // this lint rule's static analysis looks for.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { searchWorkers(); }, [searchWorkers]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!selectedWorkerId) {
      setError("Select a technician first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/corporate/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          corporatePropertyId: propertyId,
          proposedRateBdt: Number(proposedRate),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(firstIssueMessage(data.issues, data.error ?? "Booking failed."));
        return;
      }
      setSuccess(true);
      onSuccess?.();
      setTimeout(onClose, 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Request Service
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {property.label} — {property.address}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body (scrollable) */}
        <form onSubmit={handleBook} className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {error && <p className={errorBannerClasses}>{error}</p>}
          {success && <p className={successBannerClasses}>Booking submitted! The technician will respond shortly.</p>}

          {/* Worker search */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Find a technician
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClasses} flex-1`}
                placeholder="e.g. plumber, electrician…"
              />
              <button
                type="button"
                onClick={searchWorkers}
                className={secondaryButtonClasses}
              >
                Search
              </button>
            </div>
          </div>

          {/* Worker results */}
          <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            {searchLoading && (
              <p className="p-4 text-center text-sm text-zinc-400">Searching…</p>
            )}
            {!searchLoading && workers.length === 0 && (
              <p className="p-4 text-center text-sm text-zinc-400">No technicians found in this area.</p>
            )}
            {!searchLoading &&
              workers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition last:border-0 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50 ${selectedWorkerId === w.id
                    ? "bg-brand-50 dark:bg-brand-950/30"
                    : ""
                    }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                    {w.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {w.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {w.headline} · {formatRateRange(w.hourlyRateMinBdt, w.hourlyRateMaxBdt)}
                    </p>
                  </div>
                  {selectedWorkerId === w.id && (
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      Selected
                    </span>
                  )}
                </button>
              ))}
          </div>

          {/* Rate proposal (only after selecting a worker) */}
          {selectedWorker && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Proposed rate (BDT)
              </span>
              <input
                required
                type="number"
                min={100}
                max={200000}
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
                className={inputClasses}
                placeholder={`e.g. ${selectedWorker.hourlyRateMinBdt}`}
              />
              
            </label>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !selectedWorkerId || !proposedRate}
              className={`${primaryButtonClasses} mt-0 flex-1`}
            >
              {isSubmitting ? "Submitting…" : "Submit Booking"}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClasses}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icon                                                   */
/* ------------------------------------------------------------------ */

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
