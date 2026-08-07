"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";

type BookingStartWorker = {
  id: string;
  user: { name: string };
  addressDetail: string;
  hourlyRateMinBdt: number;
  hourlyRateMaxBdt: number;
  categories: Array<{ category: { name: string }; isPrimary?: boolean }>;
};

export function BookingStart({ worker }: { worker: BookingStartWorker }) {
  const router = useRouter();
  const [address, setAddress] = useState(worker.addressDetail || "");

  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Book {worker.user.name}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Confirm your address and the fixed charge before confirming the worker.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Step 1
        </span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Address
        </label>
        <textarea
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="mt-2 min-h-[120px] w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
          placeholder="Enter your service address"
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Fixed upfront charge</p>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(basePrice)}</p>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This is the base price for the visit and standard job scope. Any extra charge will be handled after the worker arrives.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push(`/workers/${worker.id}/booking/confirm`)}
        className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Confirm worker
      </button>
    </div>
  );
}
