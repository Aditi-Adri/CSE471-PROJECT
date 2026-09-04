"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cardClasses, primaryButtonClasses } from "@/lib/ui/formStyles";
import { formatRadiusKm } from "@/lib/constants/subscriptionPlans";

type SubscriptionStatus = {
  serviceRadiusKm: number;
  planName: string;
  subscriptionTier: string;
  daysLeft: number | null;
  subscriptionExpiresAt: string | null;
  isActive: boolean;
};

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * The small "Subscription Status" widget on the worker's dashboard
 * (app/account/page.tsx). Same self-fetch pattern as
 * components/verification/VerificationDashboard.tsx: one GET to
 * /api/subscription/status, no props needed from the server page.
 *
 * Two looks, driven entirely by `isActive`:
 *  - Basic (inactive): shows the free 1km range + an "Upgrade Plan" button.
 *  - A paid plan (active): shows the plan name + a live "days left" countdown + expiry date.
 */
export function SubscriptionStatusCard() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => setStatus(data.worker ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={`${cardClasses} h-40 animate-pulse`} />;
  }
  if (!status) {
    return null; // Not a worker, or no worker profile yet — nothing to show here.
  }

  return (
    <div className={cardClasses}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Subscription</h2>
        {status.isActive && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {status.planName}
          </span>
        )}
      </div>

      {status.isActive ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
              {status.daysLeft} {status.daysLeft === 1 ? "day" : "days"} remaining
            </p>
            {status.subscriptionExpiresAt && (
              <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                Expires on{" "}
                {new Date(status.subscriptionExpiresAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Search radius: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatRadiusKm(status.serviceRadiusKm)}</span>
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You&apos;re on the free <span className="font-medium text-zinc-900 dark:text-zinc-100">Basic</span> plan —
            visible to customers within a{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatRadiusKm(status.serviceRadiusKm)}</span>{" "}
            radius.
          </p>
          <Link href="/dashboard/worker/subscription" className={`${primaryButtonClasses} mt-0`}>
            Upgrade plan
          </Link>
        </div>
      )}

      <Link
        href="/dashboard/worker/subscription"
        className="mt-4 block text-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        {status.isActive ? "Manage subscription" : "See all plans"} →
      </Link>
    </div>
  );
}
