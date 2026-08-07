"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateTotal, formatCurrency, generateOtp } from "@/lib/booking/bookingFlow";

type BookingFlowWorker = {
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

export function BookingFlow({ worker }: { worker: BookingFlowWorker }) {
  const [savedAddress, setSavedAddress] = useState(worker.addressDetail);
  const [addressDraft, setAddressDraft] = useState(worker.addressDetail);
  const [otp, setOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [arrivalVerified, setArrivalVerified] = useState(false);
  const [variationText, setVariationText] = useState("");
  const [variationAmount, setVariationAmount] = useState("250");
  const [pendingVariation, setPendingVariation] = useState<PendingVariation | null>(null);
  const [approvedExtra, setApprovedExtra] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("hirelocal.saved-address");
    if (stored) {
      setSavedAddress(stored);
      setAddressDraft(stored);
    }
  }, []);

  const basePrice = useMemo(() => {
    const midpoint = Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);
    return Math.max(midpoint, 1200);
  }, [worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt]);

  const finalTotal = calculateTotal(basePrice, approvedExtra);

  const saveAddress = () => {
    const nextAddress = addressDraft.trim() || worker.addressDetail;
    setSavedAddress(nextAddress);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hirelocal.saved-address", nextAddress);
    }
  };

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Direct booking control</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Save your home address, verify arrival, and settle extra work in one flow.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Live demo
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">1. Saved home address</h3>
            <span className="text-xs text-zinc-500">Defaults every booking</span>
          </div>
          <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Home address
          </label>
          <textarea
            value={addressDraft}
            onChange={(event) => setAddressDraft(event.target.value)}
            className="mt-2 min-h-20 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none ring-0 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
            placeholder="Enter your home address"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAddress}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Save for future bookings
            </button>
            <span className="rounded-full border border-zinc-200 px-2.5 py-2 text-xs text-zinc-500 dark:border-zinc-700">
              {savedAddress}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">2. Fixed upfront price</h3>
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(basePrice)}</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>• Base visit and diagnostic assessment</li>
            <li>• Standard labor for {worker.categories[0]?.category.name ?? "selected service"}</li>
            <li>• Cleanup and handover notes</li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">3. Arrival OTP verification</h3>
            {arrivalVerified ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Verified
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

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">4. Mid-job variation request</h3>
            <span className="text-xs text-zinc-500">Text-only extra charge</span>
          </div>
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

          {pendingVariation ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">New request from {worker.user.name}</p>
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

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">5. Direct completion & receipt</h3>
            <button
              type="button"
              onClick={() => setIsCompleted(true)}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Mark finished
            </button>
          </div>

          {isCompleted ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Digital receipt ready</p>
              <div className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
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
                <div className="flex justify-between gap-4 border-t border-emerald-200 pt-2 font-semibold dark:border-emerald-900">
                  <span>Total</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              One tap finalizes the job and opens the receipt instantly.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
