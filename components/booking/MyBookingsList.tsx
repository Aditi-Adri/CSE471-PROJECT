"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  /**
   * Customer view only (absent on the worker's job list — see
   * app/api/bookings/mine/route.ts). "can_review" is what turns the
   * status pill below into a distinct, obviously-clickable "Rate now"
   * call-to-action instead of a plain status label.
   */
  reviewStatus?: "none" | "can_review" | "reviewed";
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

  const refetch = useCallback(() => {
    return fetch("/api/bookings/mine")
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings ?? []));
  }, []);

  useEffect(() => {
    refetch();
    const handleFocus = () => refetch();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    const interval = setInterval(refetch, 3000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      clearInterval(interval);
    };
  }, [refetch]);

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
        const canReview = b.reviewStatus === "can_review";
        return (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className={`flex items-center justify-between gap-4 rounded-2xl border p-5 transition hover:shadow-md ${
              canReview
                ? "border-amber-300 bg-amber-50/60 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950/20 dark:hover:border-amber-700"
                : "border-zinc-200 bg-white hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800"
            }`}
          >
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">{b.counterpartyName}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {rate != null && <> · {formatCurrency(rate)}</>}
              </p>
              {/* Spelled out, not just a colored pill — a status badge alone
                  doesn't read as "click here to do something." */}
              {canReview && (
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Tap to rate this job →
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {canReview ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                  ★ Rate now
                </span>
              ) : (
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              )}
              {b.reviewStatus === "reviewed" && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">✓ You rated this</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
