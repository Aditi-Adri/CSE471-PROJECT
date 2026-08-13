"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";
import { cardClasses } from "@/lib/ui/formStyles";

type MyBooking = {
  id: string;
  status: string;
  counterpartyName: string;
  proposedRateBdt: number | null;
  counterRateBdt: number | null;
  agreedRateBdt: number | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: "Waiting for a response",
  CONFIRMED: "Confirmed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
  ARRIVED: "Technician arrived",
  COMPLETED: "Completed",
};

/**
 * The customer-facing counterpart to WorkerJobsList — "who did I send
 * a booking request to, and what happened to it." This didn't exist
 * when the booking flow first shipped: a customer could create a
 * booking and land on its status page once, but had no way back to
 * it (or to any other booking) afterward — see /account's "My
 * bookings" quick link, which is what actually gets someone here now.
 */
export function MyBookingsList() {
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);

  useEffect(() => {
    fetch("/api/bookings/mine")
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings ?? []));
  }, []);

  if (bookings === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (bookings.length === 0) {
    return (
      <div className={cardClasses}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You haven&apos;t booked anyone yet.{" "}
          <Link href="/search" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Find a technician →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => {
        const rate = b.agreedRateBdt ?? b.counterRateBdt ?? b.proposedRateBdt;
        return (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800"
          >
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">{b.counterpartyName}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {rate != null && <> · {formatCurrency(rate)}</>}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
