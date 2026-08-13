"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";
import { cardClasses, errorBannerClasses, inputClasses, primaryButtonClasses } from "@/lib/ui/formStyles";

type JobBooking = {
  id: string;
  status: string;
  counterpartyName: string;
  proposedRateBdt: number | null;
  counterRateBdt: number | null;
  agreedRateBdt: number | null;
  arrivalCode: string | null;
  arrivalVerifiedAt: string | null;
  serviceAddress: string | null;
  customerPhone: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: "Awaiting your response",
  CONFIRMED: "Confirmed — verify on arrival",
  REJECTED: "You declined",
  CANCELLED: "Cancelled",
  ARRIVED: "Arrived — awaiting customer sign-off",
  COMPLETED: "Completed",
};

export function WorkerJobsList() {
  const [jobs, setJobs] = useState<JobBooking[] | null>(null);

  const refetch = useCallback(() => {
    return fetch("/api/bookings/mine")
      .then((res) => res.json())
      .then((data) => setJobs(data.bookings ?? []));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (jobs === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (jobs.length === 0) {
    return (
      <div className={cardClasses}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No booking requests yet — they&apos;ll show up here as soon as a customer books you.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onChange={refetch} />
      ))}
    </div>
  );
}

function JobCard({ job, onChange }: { job: JobBooking; onChange: () => void }) {
  const [counterRate, setCounterRate] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function respond(action: "accept" | "reject" | "counter") {
    setError(null);
    setIsSubmitting(true);
    const body =
      action === "counter"
        ? { action, counterRateBdt: Number(counterRate) }
        : { action };
    const res = await fetch(`/api/bookings/${job.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    onChange();
  }

  async function verifyCode() {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/bookings/${job.id}/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    onChange();
  }

  const isAwaitingWorker = job.status === "PENDING_ACCEPTANCE" && job.counterRateBdt == null;
  const isAwaitingCustomer = job.status === "PENDING_ACCEPTANCE" && job.counterRateBdt != null;

  return (
    <div className={cardClasses}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{job.counterpartyName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
      </div>

      {error && <p className={`mt-3 ${errorBannerClasses}`}>{error}</p>}

      {isAwaitingWorker && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Proposed rate: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(job.proposedRateBdt ?? 0)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => respond("accept")}
              className={primaryButtonClasses}
            >
              Accept
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => respond("reject")}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Decline
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={100}
              value={counterRate}
              onChange={(e) => setCounterRate(e.target.value)}
              placeholder="Counter rate (৳)"
              className={`${inputClasses} w-40`}
            />
            <button
              type="button"
              disabled={isSubmitting || !counterRate}
              onClick={() => respond("counter")}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Send counter-offer
            </button>
          </div>
        </div>
      )}

      {isAwaitingCustomer && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          You countered at {formatCurrency(job.counterRateBdt ?? 0)} — waiting for the customer to accept or decline.
        </p>
      )}

      {job.status === "CONFIRMED" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Agreed rate: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(job.agreedRateBdt ?? 0)}</span>
            {" — "}enter the arrival code shown in your app once you&apos;re heading out:
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={4}
            placeholder="Code"
            className={`${inputClasses} w-24`}
          />
          <button
            type="button"
            disabled={isSubmitting || !code}
            onClick={verifyCode}
            className={primaryButtonClasses}
          >
            Confirm
          </button>
        </div>
      )}

      {(job.status === "ARRIVED" || job.status === "COMPLETED") && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-700 dark:text-zinc-300">{job.serviceAddress}</p>
          {job.customerPhone && <p className="mt-1 text-zinc-500 dark:text-zinc-400">{job.customerPhone}</p>}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {job.status === "ARRIVED" ? "Waiting for the customer to mark this complete." : "Job complete."}
          </p>
        </div>
      )}
    </div>
  );
}
