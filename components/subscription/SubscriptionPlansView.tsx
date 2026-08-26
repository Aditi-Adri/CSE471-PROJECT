"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cardClasses,
  errorBannerClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
  successBannerClasses,
} from "@/lib/ui/formStyles";
import { SUBSCRIPTION_PLANS, formatRadiusKm, getPlan, TRIAL_PLAN } from "@/lib/constants/subscriptionPlans";
import { WorkingRadiusMap } from "./WorkingRadiusMap";
import type { DhakaArea, SubscriptionTier } from "@/app/generated/prisma/client";

type SubscriptionStatus = {
  area: DhakaArea;
  currentLat: number | null;
  currentLng: number | null;
  serviceRadiusKm: number;
  planName: string;
  subscriptionTier: SubscriptionTier;
  daysLeft: number | null;
  subscriptionExpiresAt: string | null;
  subscriptionTrialUsed: boolean;
  isActive: boolean;
};

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * The full `/dashboard/worker/subscription` page content. Same
 * self-fetch pattern as VerificationDashboard: load the worker's
 * current status once, then re-fetch it after any checkout attempt so
 * the screen (and the map) always reflect the real, current plan
 * instead of trusting client-side guesses.
 */
export function SubscriptionPlansView({ workerId }: { workerId: string }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTier, setBusyTier] = useState<string | null>(null); // which button is currently submitting
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  // Which plan's radius the map is currently previewing — starts out
  // matching whatever the worker is actually on, and moves to whichever
  // card they click so they can see the radius change before buying.
  const [previewTier, setPreviewTier] = useState<SubscriptionTier>("BASIC");

  useEffect(() => {
    if (status) setPreviewTier(status.subscriptionTier);
  }, [status]);

  const refetch = useCallback(() => {
    return fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => setStatus(data.worker ?? null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();

    // If SSLCommerz just redirected us back here, show a one-time
    // banner based on the `?payment=` flag — same pattern the Spare
    // Parts Shop cart page uses for its own payment redirects.
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") setMessage({ kind: "success", text: "Payment confirmed — your plan is now active!" });
    else if (payment === "failed") setMessage({ kind: "error", text: "That payment failed. Please try again." });
    else if (payment === "cancelled") setMessage({ kind: "error", text: "Payment was cancelled." });
    else if (payment === "unconfirmed")
      setMessage({ kind: "error", text: "We couldn't confirm that payment. If money left your account, contact support." });
  }, [refetch]);

  async function buyPlan(tier: SubscriptionTier) {
    setBusyTier(tier);
    setMessage(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl; // Hand off to the SSLCommerz hosted checkout page.
        return;
      }
      setMessage({ kind: "success", text: data.message ?? "Plan activated!" });
      await refetch();
    } finally {
      setBusyTier(null);
    }
  }

  async function startTrial() {
    setBusyTier("TRIAL");
    setMessage(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "PREMIUM", trial: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      setMessage({ kind: "success", text: data.message ?? "Trial started!" });
      await refetch();
    } finally {
      setBusyTier(null);
    }
  }

  if (loading || !status) {
    return <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const canClaimTrial = !status.subscriptionTrialUsed && status.subscriptionTier === "BASIC";

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p className={message.kind === "success" ? successBannerClasses : errorBannerClasses}>{message.text}</p>
      )}

      {/* Current plan summary */}
      <div className={cardClasses}>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your current plan</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {status.planName}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Radius: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatRadiusKm(status.serviceRadiusKm)}</span>
          </span>
          {status.isActive && status.daysLeft != null && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{status.daysLeft}</span>{" "}
              {status.daysLeft === 1 ? "day" : "days"} left
            </span>
          )}
        </div>
      </div>

      {/* 30-day free trial banner — only shown once, before it's ever been used */}
      {canClaimTrial && (
        <div className="rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50 p-6 dark:border-brand-700 dark:bg-brand-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Limited-time offer
          </p>
          <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Try {TRIAL_PLAN.name} — free for {TRIAL_PLAN.durationDays} days
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Get the full {formatRadiusKm(TRIAL_PLAN.radiusKm)} Premium radius and priority search placement, no
            payment required. One-time offer per worker.
          </p>
          <button
            type="button"
            onClick={startTrial}
            disabled={busyTier !== null}
            className={`${primaryButtonClasses} mt-4`}
          >
            {busyTier === "TRIAL" ? "Activating…" : "Start my free trial"}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <p className="-mb-2 text-sm text-zinc-500 dark:text-zinc-400">
        Click a plan below to preview its radius on the map — buying it is a separate step.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          // Simple, easy-to-explain rule: whichever plan matches the
          // worker's current tier is "current" — nothing fancier needed.
          const current = plan.tier === status.subscriptionTier;
          const previewed = plan.tier === previewTier;

          return (
            <div
              key={plan.tier}
              onClick={() => setPreviewTier(plan.tier)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setPreviewTier(plan.tier);
              }}
              // Clicking anywhere on the card previews its radius on the
              // map below — the ring shows which card is being
              // previewed, separately from the "Current plan" badge.
              className={`flex cursor-pointer flex-col rounded-2xl border p-5 transition ${
                previewed
                  ? "border-brand-500 ring-2 ring-brand-500/40"
                  : "border-zinc-200 hover:border-brand-300 dark:border-zinc-800 dark:hover:border-brand-800"
              } ${plan.isPopular ? "shadow-lg shadow-brand-500/10" : ""} bg-white dark:bg-zinc-900`}
            >
              {plan.isPopular && (
                <span className="mb-2 inline-block w-fit rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {plan.priceBdt === 0 ? "Free" : `৳${plan.priceBdt}`}
                {plan.priceBdt > 0 && (
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400"> / {plan.durationDays} days</span>
                )}
              </p>
              <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                {formatRadiusKm(plan.radiusKm)} radius
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>

              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={current || busyTier !== null || plan.tier === "BASIC"}
                onClick={() => buyPlan(plan.tier)}
                className={`mt-5 ${current ? secondaryButtonClasses : primaryButtonClasses}`}
              >
                {current ? "Current plan" : busyTier === plan.tier ? "Redirecting…" : plan.tier === "BASIC" ? "Always free" : "Buy plan"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Google-Maps-style radius view — see components/subscription/WorkingRadiusMap.tsx
          for why this reuses the project's existing Leaflet + OpenStreetMap map stack.
          Shows whichever plan card was last clicked, not just the active plan, so a
          worker can see how far each plan would reach before buying it. */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {previewTier === status.subscriptionTier ? "Your service radius on the map" : "Previewing a plan's radius"}
          </h2>
          {previewTier !== status.subscriptionTier && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing <span className="font-medium text-zinc-900 dark:text-zinc-100">{getPlan(previewTier).name}</span>{" "}
              ({formatRadiusKm(getPlan(previewTier).radiusKm)}) — you&apos;re still on{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{status.planName}</span> until you buy it.
            </p>
          )}
        </div>
        <WorkingRadiusMap
          area={status.area}
          currentLat={status.currentLat}
          currentLng={status.currentLng}
          radiusKm={getPlan(previewTier).radiusKm}
          seed={workerId}
        />
      </div>
    </div>
  );
}
