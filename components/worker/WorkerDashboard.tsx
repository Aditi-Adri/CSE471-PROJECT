"use client";

import { useMemo, useState } from "react";
import { calculateTotal, formatCurrency } from "@/lib/booking/bookingFlow";

type WorkerDashboardProps = {
  worker: {
    id: string;
    user: { name: string };
    addressDetail: string;
    hourlyRateMinBdt: number;
    hourlyRateMaxBdt: number;
  };
};

type PendingExtra = {
  description: string;
  amount: number;
};

export function WorkerDashboard({ worker }: WorkerDashboardProps) {
  const [arrived, setArrived] = useState(false);
  const [extraDescription, setExtraDescription] = useState("");
  const [extraAmount, setExtraAmount] = useState("250");
  const [pendingExtra, setPendingExtra] = useState<PendingExtra | null>(null);
  const [approvedExtra, setApprovedExtra] = useState(0);
  const [completed, setCompleted] = useState(false);

  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  const total = calculateTotal(basePrice, approvedExtra);

  const submitExtraRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(extraAmount);
    if (!extraDescription.trim() || Number.isNaN(amount) || amount <= 0) return;
    setPendingExtra({ description: extraDescription.trim(), amount });
    setExtraDescription("");
    setExtraAmount("250");
  };

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Worker dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your current job, confirm arrival, and handle extra charges.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Active job
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{worker.user.name}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{worker.addressDetail}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Base price</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatCurrency(basePrice)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Arrival status</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {arrived ? "Worker has arrived. Extra request and finish controls are available." : "Tap to confirm arrival at the site."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setArrived(true)}
              disabled={arrived || completed}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            >
              {arrived ? "Arrived" : "Mark arrived"}
            </button>
          </div>
        </div>

        {arrived && !completed ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Extra issue request</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Add a short description and amount if you find an issue that needs extra approval.
            </p>
            <form onSubmit={submitExtraRequest} className="mt-4 space-y-3">
              <textarea
                value={extraDescription}
                onChange={(event) => setExtraDescription(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none ring-1 ring-transparent transition focus:border-brand-300 focus:ring-brand-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                placeholder="Describe the extra issue found"
                rows={4}
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={extraAmount}
                  onChange={(event) => setExtraAmount(event.target.value)}
                  className="w-32 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  placeholder="Amount"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Request extra charge
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {pendingExtra ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Pending approval</p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{pendingExtra.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-700 dark:text-amber-300">Requested</p>
                <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">{formatCurrency(pendingExtra.amount)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setApprovedExtra(pendingExtra.amount);
                  setPendingExtra(null);
                }}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setPendingExtra(null)}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              >
                Decline
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Total bill</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Base price plus any approved extras.</p>
            </div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatCurrency(total)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCompleted(true)}
          disabled={!arrived || completed}
          className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
        >
          Finish job
        </button>

        {completed ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-semibold">Job completed</p>
            <p className="mt-2">The final bill is {formatCurrency(total)}. The customer flow can now show the receipt.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
