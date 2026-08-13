"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";
import { errorBannerClasses } from "@/lib/ui/formStyles";

type BookingStartWorker = {
  id: string;
  user: { name: string };
  hourlyRateMinBdt: number;
  hourlyRateMaxBdt: number;
  categories: Array<{ category: { name: string }; isPrimary?: boolean }>;
};

export function BookingStart({
  worker,
  customerAddress,
}: {
  worker: BookingStartWorker;
  /** The signed-in customer's saved address (from /account), if any. */
  customerAddress: string;
}) {
  const router = useRouter();
  const [address, setAddress] = useState(customerAddress);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  async function confirmWorker() {
    setError(null);

    if (!address.trim()) {
      setError("Enter a service address first.");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: worker.id, address, proposedRateBdt: basePrice }),
    });

    if (res.status === 401) {
      router.push(`/login?callbackUrl=/workers/${worker.id}/booking`);
      return;
    }

    const data = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't send that booking request. Please try again.");
      return;
    }

    router.push(`/bookings/${data.booking.id}`);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Book {worker.user.name}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Confirm your address and proposed rate — {worker.user.name} can accept it, counter, or decline.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Step 1
        </span>
      </div>

      {error && <p className={`mb-4 ${errorBannerClasses}`}>{error}</p>}

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
        {customerAddress ? (
          <p className="mt-1.5 text-xs text-zinc-400">Prefilled from your saved address — edit it if this job is elsewhere.</p>
        ) : (
          <p className="mt-1.5 text-xs text-zinc-400">
            <Link href="/account" className="text-brand-600 hover:underline dark:text-brand-400">
              Save an address on your profile
            </Link>{" "}
            to skip typing this every time.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your proposed rate</p>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(basePrice)}</p>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          A fair starting offer based on {worker.user.name}&apos;s listed rate range. They can accept it as-is or
          send back a counter-offer before the job is confirmed.
        </p>
      </div>

      <button
        type="button"
        onClick={confirmWorker}
        disabled={isSubmitting}
        className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending request…" : "Send booking request"}
      </button>
    </div>
  );
}
