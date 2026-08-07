"use client";

import { useMemo, useState } from "react";
import { calculateTotal, formatCurrency, generateOtp } from "@/lib/booking/bookingFlow";

type BookingConfirmWorker = {
  id: string;
  user: { name: string };
  addressDetail: string;
  hourlyRateMinBdt: number;
  hourlyRateMaxBdt: number;
  categories: Array<{ category: { name: string }; isPrimary?: boolean }>;
};

type PendingVariation = {
  description: string;
  amount: number;
};

export function BookingConfirm({ worker }: { worker: BookingConfirmWorker }) {
  const [otp, setOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [arrivalVerified, setArrivalVerified] = useState(false);
  const [variationText, setVariationText] = useState("");
  const [variationAmount, setVariationAmount] = useState("250");
  const [pendingVariation, setPendingVariation] = useState<PendingVariation | null>(null);
  const [approvedExtra, setApprovedExtra] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  const finalTotal = calculateTotal(basePrice, approvedExtra);

  const requestOtp = () => {
    const nextOtp = generateOtp();
    setOtp(nextOtp);
    setOtpInput("");
    setArrivalVerified(false);
  };

  const verifyOtp = () => {
    if (otpInput.trim() === otp) {
      setArrivalVerified(true);
    }
  };

  const submitVariation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(variationAmount);
    if (!variationText.trim() || Number.isNaN(amount) || amount <= 0) return;
    setPendingVariation({ description: variationText.trim(), amount });
    setVariationText("");
    setVariationAmount("250");
  };

  const approveVariation = () => {
    if (pendingVariation) {
      setApprovedExtra(pendingVariation.amount);
      setPendingVariation(null);
    }
  };

  const declineVariation = () => {
    setApprovedExtra(0);
    setPendingVariation(null);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Worker arrival & approval</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track arrival, approve any extra charge, and finish the job.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Step 2
        </span>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Arrival verification</h3>
          {arrivalVerified ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Arrived
            </span>
          ) : (
            <span className="text-xs text-zinc-500">Share with the technician</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestOtp}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Generate arrival code
          </button>
          {otp ? <span className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold tracking-[0.3em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{otp}</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={otpInput}
            onChange={(event) => setOtpInput(event.target.value)}
            className="w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
            placeholder="Enter code"
            maxLength={4}
          />
          <button
            type="button"
            onClick={verifyOtp}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Confirm arrival
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Extra charge request</h3>
          <span className="text-xs text-zinc-500">Hidden until arrival</span>
        </div>
        {arrivalVerified ? (
          <form onSubmit={submitVariation} className="mt-3 space-y-3">
            <textarea
              value={variationText}
              onChange={(event) => setVariationText(event.target.value)}
              className="min-h-20 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
              placeholder="Describe the extra issue found"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="50"
                step="50"
                value={variationAmount}
                onChange={(event) => setVariationAmount(event.target.value)}
                className="w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Send variation request
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            The extra charge request appears after worker arrival is confirmed.
          </p>
        )}

        {pendingVariation ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Worker requested an extra charge</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{pendingVariation.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={approveVariation}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Approve +{formatCurrency(pendingVariation.amount)}
              </button>
              <button
                type="button"
                onClick={declineVariation}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
              >
                Decline
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Total bill</h3>
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(finalTotal)}</span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between gap-4">
            <span>Base price</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
          {approvedExtra > 0 ? (
            <div className="flex justify-between gap-4">
              <span>Approved extra</span>
              <span>{formatCurrency(approvedExtra)}</span>
            </div>
          ) : null}
          <div className="rounded-t-xl border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
            <span>Total</span>
            <span className="float-right">{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setIsCompleted(true)}
        className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Finish job
      </button>

      {isCompleted ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Worker has finished the job. Your final bill is shown above.
        </div>
      ) : null}
    </div>
  );
}
