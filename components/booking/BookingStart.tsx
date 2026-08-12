"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";
import { BookingConfirm } from "@/components/booking/BookingConfirm";
import LiveTrackingMap from "@/components/tracking/LiveTrackingMap";
import WorkerLocationSender from "@/components/tracking/WorkerLocationSender";
import SOSButton from "@/components/tracking/SOSButton";

type BookingStartWorker = {
  id: string;
  user: { name: string };
  addressDetail: string;
  hourlyRateMinBdt: number;
  hourlyRateMaxBdt: number;
  categories: Array<{ category: { name: string }; isPrimary?: boolean }>;
};

type ActiveStep = "step1" | "step2" | "tracking";

export function BookingStart({ worker }: { worker: BookingStartWorker }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<ActiveStep>("step1");
  const [address, setAddress] = useState(worker.addressDetail || "");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  const handleConfirmAndTrack = async () => {
    if (isBooking) return;
    setIsBooking(true);
    setError("");

    try {
      const res = await fetch("/api/tracking/booking/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id }),
      });

      const data = await res.json();

      if (res.ok && data.bookingId) {
        setCreatedBookingId(data.bookingId);
        setActiveStep("tracking");
      } else {
        router.push(`/track/booking-demo-id`);
      }
    } catch {
      setError("Network error. Switching to tracking mode...");
      setActiveStep("tracking");
    } finally {
      setIsBooking(false);
    }
  };

  const handleProceedToStep2 = () => {
    setActiveStep("step2");
  };

  const destination = { lat: 23.7808, lng: 90.4194 };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* ── STEP 1: Address & Upfront Price ── */}
      {activeStep === "step1" && (
        <>
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

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Button 1: Confirm and track worker live */}
          <button
            type="button"
            onClick={handleConfirmAndTrack}
            disabled={isBooking}
            className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBooking ? "Creating booking..." : "Confirm and track worker live"}
          </button>

          {/* Button 2: Proceed to Step 2 (Directly BELOW Button 1) */}
          <button
            type="button"
            onClick={handleProceedToStep2}
            className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Proceed to Step 2
          </button>
        </>
      )}

      {/* ── STEP 2: Worker Arrival & Approval (Live Tracking Map NOT rendered) ── */}
      {activeStep === "step2" && (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveStep("step1")}
              className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Back to Step 1
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("tracking")}
              className="text-xs font-semibold text-brand-600 transition hover:underline dark:text-brand-400"
            >
              Switch to Live Tracking Map →
            </button>
          </div>

          <BookingConfirm worker={worker} />
        </div>
      )}

      {/* ── TRACKING MODE: Live Tracking Map Interface (Step 2 NOT rendered) ── */}
      {activeStep === "tracking" && (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveStep("step1")}
              className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Back to Step 1
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("step2")}
              className="text-xs font-semibold text-brand-600 transition hover:underline dark:text-brand-400"
            >
              Proceed to Step 2 (Arrival & Approval) →
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-md dark:border-zinc-800">
            <LiveTrackingMap
              bookingId={createdBookingId || "booking-demo-id"}
              destination={destination}
            />
            <WorkerLocationSender
              bookingId={createdBookingId || "booking-demo-id"}
              destination={destination}
            />

            <div className="bg-zinc-900 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                  {worker.user.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="font-semibold text-sm">{worker.user.name}</div>
                  <div className="text-xs text-zinc-400">
                    {worker.categories[0]?.category.name || "Technician"}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <SOSButton
                  customerId="customer-demo-id"
                  customerPhone="+8801408606698"
                  fallbackLocation={destination}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
