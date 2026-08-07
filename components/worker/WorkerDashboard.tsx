"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";

type WorkerDashboardProps = {
  worker: {
    id: string;
    user: { name: string };
    addressDetail: string;
    hourlyRateMinBdt: number;
    hourlyRateMaxBdt: number;
  };
};

export function WorkerDashboard({ worker }: WorkerDashboardProps) {
  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Worker dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Minimal job summary for the current worker.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Job overview
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
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
    </div>
  );
}
