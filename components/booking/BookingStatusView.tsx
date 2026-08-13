"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";
import { cardClasses, errorBannerClasses, primaryButtonClasses, successBannerClasses } from "@/lib/ui/formStyles";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";

type BookingDetail = {
  id: string;
  status: string;
  proposedRateBdt: number | null;
  counterRateBdt: number | null;
  agreedRateBdt: number | null;
  arrivalCode: string | null;
  arrivalVerifiedAt: string | null;
  serviceAddress: string | null;
  destinationLat: number;
  destinationLng: number;
};

const TRACKABLE_STATUSES = new Set(["CONFIRMED", "ARRIVED"]);

const STATUS_COPY: Record<string, string> = {
  PENDING_ACCEPTANCE: "Waiting for the technician to respond.",
  REJECTED: "The technician declined this request.",
  CANCELLED: "This booking was cancelled.",
  CONFIRMED: "Confirmed — the technician will verify the arrival code before heading out.",
  ARRIVED: "The technician has arrived and verified the code.",
  COMPLETED: "Job complete.",
};

// Only worth polling while something's still in motion — once it's
// settled (completed/rejected/cancelled) there's nothing left to change.
const LIVE_STATUSES = new Set(["PENDING_ACCEPTANCE", "CONFIRMED"]);

export function BookingStatusView({ workerName, initial }: { workerName: string; initial: BookingDetail }) {
  const [booking, setBooking] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refetch = useCallback(() => {
    fetch(`/api/bookings/${initial.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.booking) setBooking(data.booking);
      });
  }, [initial.id]);

  useEffect(() => {
    if (!LIVE_STATUSES.has(booking.status)) return;
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [booking.status, refetch]);

  async function respondToCounter(action: "accept" | "reject") {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/bookings/${booking.id}/respond-counter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setBooking(data.booking);
  }

  async function markComplete() {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/bookings/${booking.id}/complete`, { method: "POST" });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setBooking(data.booking);
  }

  return (
    <div className={cardClasses}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Booking with {workerName}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{STATUS_COPY[booking.status] ?? booking.status}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {booking.status}
        </span>
      </div>

      {error && <p className={`mt-4 ${errorBannerClasses}`}>{error}</p>}

      {booking.status === "PENDING_ACCEPTANCE" && booking.counterRateBdt == null && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          You offered {formatCurrency(booking.proposedRateBdt ?? 0)}.
        </p>
      )}

      {booking.status === "PENDING_ACCEPTANCE" && booking.counterRateBdt != null && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {workerName} countered at {formatCurrency(booking.counterRateBdt)}.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => respondToCounter("accept")}
              className={primaryButtonClasses}
            >
              Accept {formatCurrency(booking.counterRateBdt)}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => respondToCounter("reject")}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {(booking.status === "CONFIRMED" || booking.status === "ARRIVED" || booking.status === "COMPLETED") && (
        <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Agreed rate:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {booking.agreedRateBdt != null ? formatCurrency(booking.agreedRateBdt) : "To be agreed on arrival"}
            </span>
          </p>
          {booking.status === "CONFIRMED" && booking.arrivalCode && (
            <p>
              Arrival code:{" "}
              <span className="rounded-lg bg-zinc-100 px-2 py-1 font-semibold tracking-[0.3em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {booking.arrivalCode}
              </span>
              {" — "}your technician&apos;s app shows the same code and confirms it on arrival, which is what
              shares your exact address with them.
            </p>
          )}
        </div>
      )}

      {booking.status === "ARRIVED" && (
        <button type="button" disabled={isSubmitting} onClick={markComplete} className={`mt-4 ${primaryButtonClasses}`}>
          Mark job complete
        </button>
      )}

      {TRACKABLE_STATUSES.has(booking.status) && (
        <div className="mt-4">
          <LiveTrackingMap
            bookingId={booking.id}
            destination={{ lat: booking.destinationLat, lng: booking.destinationLng }}
          />
        </div>
      )}

      {booking.status === "COMPLETED" && (
        <p className={`mt-4 ${successBannerClasses}`}>Job marked complete. Thanks for using HireLocal.</p>
      )}
    </div>
  );
}
