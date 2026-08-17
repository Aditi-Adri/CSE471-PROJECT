"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/search/Avatar";
import { VerificationBadge } from "@/components/search/VerificationBadge";
import { RatingStars } from "@/components/search/RatingStars";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import { primaryButtonClasses } from "@/lib/ui/formStyles";
import type { DhakaArea, VerificationTier } from "@/app/generated/prisma/client";

type ApplicantWorker = {
  id: string;
  headline: string;
  verificationTier: VerificationTier;
  ratingAvg: number;
  ratingCount: number;
  avatarSeed: string;
  user: { name: string };
};

type Application = {
  id: string;
  wageBdt: number;
  appliedAt: string;
  worker: ApplicantWorker;
};

type MyRequestItem = {
  id: string;
  description: string;
  area: DhakaArea;
  budgetMinBdt: number | null;
  budgetMaxBdt: number | null;
  status: "OPEN" | "HIRED";
  createdAt: string;
  hiredAt: string | null;
  hiredWorker: ApplicantWorker | null;
  applications: Application[];
  wageBdt: number | null;
  partsTotalBdt: number;
  totalBillBdt: number | null;
};

function WorkerSummary({ worker }: { worker: ApplicantWorker }) {
  return (
    <>
      <Avatar name={worker.user.name} seed={worker.avatarSeed} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{worker.user.name}</p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{worker.headline}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerificationBadge tier={worker.verificationTier} compact />
          <RatingStars ratingAvg={worker.ratingAvg} ratingCount={worker.ratingCount} />
        </div>
      </div>
    </>
  );
}

/**
 * The customer's own posted requests — /dashboard/my-requests. While a
 * request is OPEN, this is where the customer reviews every worker who
 * applied — full profile, rating, verification — and hires exactly one.
 * There's no push/email notification (that's Module 3's unbuilt chat
 * feature), so checking here *is* the notification for now, both for
 * "someone applied" and for confirming who got hired.
 */
export function MyRequestsList() {
  const [requests, setRequests] = useState<MyRequestItem[] | null>(null);
  const [hiring, setHiring] = useState<string | null>(null); // `${jobRequestId}:${workerId}`
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    fetch("/api/job-requests/mine")
      .then((res) => res.json())
      .then((data: { requests: MyRequestItem[] }) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]));
  }

  useEffect(refetch, []);

  async function handleHire(jobRequestId: string, workerId: string) {
    const key = `${jobRequestId}:${workerId}`;
    setHiring(key);
    setError(null);
    try {
      const res = await fetch(`/api/job-requests/${jobRequestId}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId }),
      });
      if (res.ok) {
        refetch();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Couldn't hire this worker.");
      }
    } finally {
      setHiring(null);
    }
  }

  if (requests === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        You haven&apos;t posted any requests yet — try a search that doesn&apos;t match a
        category and you&apos;ll get the option to post one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {requests.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-zinc-900 dark:text-zinc-50">{r.description}</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                r.status === "HIRED"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {r.status === "HIRED" ? "Hired" : "Waiting for applicants"}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>📍 {AREA_LABEL_BY_VALUE.get(r.area) ?? r.area}</span>
            {(r.budgetMinBdt || r.budgetMaxBdt) && (
              <span>
                💵 {r.budgetMinBdt ? formatBdt(r.budgetMinBdt) : "?"}–
                {r.budgetMaxBdt ? formatBdt(r.budgetMaxBdt) : "?"}
              </span>
            )}
          </div>

          {r.status === "HIRED" && r.hiredWorker && (
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <WorkerSummary worker={r.hiredWorker} />
                <Link
                  href={`/workers/${r.hiredWorker.id}`}
                  className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                >
                  View profile
                </Link>
              </div>
              {r.totalBillBdt !== null && (
                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  <p>Wage: {formatBdt(r.wageBdt ?? 0)}</p>
                  {r.partsTotalBdt > 0 && <p>Parts bought: {formatBdt(r.partsTotalBdt)}</p>}
                  <p className="font-semibold">Total to pay: {formatBdt(r.totalBillBdt)}</p>
                </div>
              )}
            </div>
          )}

          {r.status === "OPEN" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {r.applications.length === 0
                  ? "No applicants yet."
                  : `${r.applications.length} applicant${r.applications.length === 1 ? "" : "s"}`}
              </p>
              {r.applications.map((app) => {
                const key = `${r.id}:${app.worker.id}`;
                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <WorkerSummary worker={app.worker} />
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                        {formatBdt(app.wageBdt)}
                      </span>
                      <Link
                        href={`/workers/${app.worker.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleHire(r.id, app.worker.id)}
                        disabled={hiring === key}
                        className={`${primaryButtonClasses} mt-0 px-3 py-1.5 text-xs`}
                      >
                        {hiring === key ? "Hiring…" : "Hire"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
