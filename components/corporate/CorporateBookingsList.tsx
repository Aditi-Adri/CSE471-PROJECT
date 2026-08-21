"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";
import {
  cardClasses,
  errorBannerClasses,
  primaryButtonClasses,
  successBannerClasses,
} from "@/lib/ui/formStyles";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";

type CorporateBooking = {
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
  createdAt: string;
  workerName: string;
  workerHeadline: string;
  propertyLabel: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ACCEPTANCE: "Awaiting worker acceptance",
  CONFIRMED: "Worker accepted — arrival code ready",
  ARRIVED: "Technician arrived on site",
  COMPLETED: "Completed & invoiced",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};

const LIVE_STATUSES = new Set(["PENDING_ACCEPTANCE", "CONFIRMED", "ARRIVED"]);

export function CorporateBookingsList({
  refreshKey,
  onJobCompleted,
}: {
  refreshKey?: number;
  onJobCompleted?: () => void;
}) {
  const [bookings, setBookings] = useState<CorporateBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("corporate_dismissed_bookings");
      if (stored) setDismissedIds(JSON.parse(stored));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const dismissBooking = (id: string) => {
    setDismissedIds((prev) => {
      const updated = [...prev, id];
      try {
        localStorage.setItem("corporate_dismissed_bookings", JSON.stringify(updated));
      } catch {
        /* ignore storage errors */
      }
      return updated;
    });
  };

  const clearAllCompleted = () => {
    if (!bookings) return;
    const completedIds = bookings
      .filter((b) => !LIVE_STATUSES.has(b.status))
      .map((b) => b.id);
    setDismissedIds((prev) => {
      const updated = Array.from(new Set([...prev, ...completedIds]));
      try {
        localStorage.setItem("corporate_dismissed_bookings", JSON.stringify(updated));
      } catch {
        /* ignore storage errors */
      }
      return updated;
    });
  };

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/corporate/bookings");
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings ?? []);
      }
    } catch {
      /* ignore background errors */
    }
  }, []);

  // Fetch immediately on mount, on refreshKey change, on window focus, and poll every 3s
  useEffect(() => {
    fetchBookings();
    const handleFocus = () => fetchBookings();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    const interval = setInterval(fetchBookings, 3000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      clearInterval(interval);
    };
  }, [fetchBookings, refreshKey]);

  async function handleRespondCounter(bookingId: string, action: "accept" | "reject") {
    setError(null);
    setSubmittingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/respond-counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to respond to counter offer.");
        return;
      }
      await fetchBookings();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleMarkComplete(bookingId: string) {
    setError(null);
    setSubmittingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to mark job complete.");
        return;
      }
      await fetchBookings();
      if (onJobCompleted) {
        onJobCompleted();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (bookings === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const visibleBookings = bookings.filter((b) => !dismissedIds.includes(b.id));
  const activeBookings = visibleBookings.filter((b) => LIVE_STATUSES.has(b.status));
  const pastBookings = visibleBookings.filter((b) => !LIVE_STATUSES.has(b.status));

  if (bookings.length === 0) {
    return (
      <div className={cardClasses}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No corporate maintenance requests placed yet. Select a property below and click <strong>Request Service</strong> to hire a technician.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* ACTIVE BOOKINGS SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Active Maintenance Bookings
          </h2>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {activeBookings.length} active
          </span>
        </div>

        {error && <p className={errorBannerClasses}>{error}</p>}

        {activeBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active maintenance bookings currently in progress.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeBookings.map((b) => (
              <BookingCardItem
                key={b.id}
                booking={b}
                submittingId={submittingId}
                onRespondCounter={handleRespondCounter}
                onMarkComplete={handleMarkComplete}
                onDismiss={dismissBooking}
              />
            ))}
          </div>
        )}
      </div>

      {/* COMPLETED / PAST HISTORY SECTION */}
      {pastBookings.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <span>{showHistory ? "▼" : "▶"}</span>
              <span>Past & Completed History ({pastBookings.length})</span>
            </button>
            <button
              type="button"
              onClick={clearAllCompleted}
              className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
            >
              Clear Completed History
            </button>
          </div>

          {showHistory && (
            <div className="mt-2 flex flex-col gap-3">
              {pastBookings.map((b) => (
                <BookingCardItem
                  key={b.id}
                  booking={b}
                  submittingId={submittingId}
                  onRespondCounter={handleRespondCounter}
                  onMarkComplete={handleMarkComplete}
                  onDismiss={dismissBooking}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BookingCardItem({
  booking: b,
  submittingId,
  onRespondCounter,
  onMarkComplete,
  onDismiss,
}: {
  booking: CorporateBooking;
  submittingId: string | null;
  onRespondCounter: (id: string, action: "accept" | "reject") => void;
  onMarkComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const rate = b.agreedRateBdt ?? b.counterRateBdt ?? b.proposedRateBdt;
  const isPending = b.status === "PENDING_ACCEPTANCE";
  const isConfirmed = b.status === "CONFIRMED";
  const isArrived = b.status === "ARRIVED";
  const isCompleted = b.status === "COMPLETED";

  return (
    <div className={cardClasses}>
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {b.propertyLabel}
            </span>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {b.workerName}
            </h3>
          </div>
          {b.workerHeadline && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {b.workerHeadline}
            </p>
          )}
          {b.serviceAddress && (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              📍 {b.serviceAddress}
            </p>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
            {rate != null && (
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                {formatCurrency(rate)}
              </span>
            )}
          </div>
          {!LIVE_STATUSES.has(b.status) && (
            <button
              type="button"
              onClick={() => onDismiss(b.id)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Remove from list"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Status details & actions */}

      {/* 1. Pending Acceptance / Counter Offer */}
      {isPending && b.counterRateBdt != null && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Technician countered with {formatCurrency(b.counterRateBdt)}.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={submittingId === b.id}
              onClick={() => onRespondCounter(b.id, "accept")}
              className={primaryButtonClasses}
            >
              Accept {formatCurrency(b.counterRateBdt)}
            </button>
            <button
              type="button"
              disabled={submittingId === b.id}
              onClick={() => onRespondCounter(b.id, "reject")}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* 2. Worker Accepted -> Code + Map */}
      {isConfirmed && (
        <div className="mt-4 flex flex-col gap-4">
          {b.arrivalCode && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900/60 dark:bg-brand-950/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Arrival Verification Code
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="rounded-xl bg-white px-3.5 py-1.5 font-mono text-2xl font-bold tracking-[0.35em] text-brand-900 shadow-sm dark:bg-zinc-900 dark:text-brand-100">
                  {b.arrivalCode}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                Provide this 4-digit code to the technician upon arrival. The technician inputs this code in their Worker Dashboard to confirm arrival.
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Live Technician Location Map
            </p>
            <LiveTrackingMap
              bookingId={b.id}
              destination={{ lat: b.destinationLat, lng: b.destinationLng }}
            />
          </div>
        </div>
      )}

      {/* 3. Arrived -> Map + Mark Job Complete button */}
      {isArrived && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              ✓ Technician has arrived on site & verified code.
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Once maintenance work is finished, click <strong>Mark job complete</strong> below to finalize the booking and update your monthly invoice.
            </p>
            <button
              type="button"
              disabled={submittingId === b.id}
              onClick={() => onMarkComplete(b.id)}
              className={`${primaryButtonClasses} mt-3`}
            >
              {submittingId === b.id ? "Completing…" : "Mark job complete"}
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Technician On-Site Location
            </p>
            <LiveTrackingMap
              bookingId={b.id}
              destination={{ lat: b.destinationLat, lng: b.destinationLng }}
            />
          </div>
        </div>
      )}

      {/* 4. Completed */}
      {isCompleted && (
        <div className="mt-4">
          <p className={successBannerClasses}>
            ✓ Job complete — {formatCurrency(b.agreedRateBdt ?? b.proposedRateBdt ?? 0)} added to monthly corporate invoice.
          </p>
        </div>
      )}
    </div>
  );
}