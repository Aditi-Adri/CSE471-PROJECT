"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/search/Avatar";
import { VerificationBadge } from "@/components/search/VerificationBadge";
import { RatingStars } from "@/components/search/RatingStars";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import type { DhakaArea, VerificationTier } from "@/app/generated/prisma/client";

type ClaimedByWorker = {
  id: string;
  headline: string;
  verificationTier: VerificationTier;
  ratingAvg: number;
  ratingCount: number;
  avatarSeed: string;
  user: { name: string };
};

type MyRequestItem = {
  id: string;
  description: string;
  area: DhakaArea;
  budgetMinBdt: number | null;
  budgetMaxBdt: number | null;
  status: "OPEN" | "CLAIMED";
  createdAt: string;
  claimedAt: string | null;
  claimedBy: ClaimedByWorker | null;
};

/**
 * The customer's own posted requests — /dashboard/my-requests. This is
 * how they find out a request got claimed: no push/email notification
 * exists (that's the unbuilt Module 3 chat/notifications feature), so
 * checking here *is* the notification for now.
 */
export function MyRequestsList() {
  const [requests, setRequests] = useState<MyRequestItem[] | null>(null);

  useEffect(() => {
    fetch("/api/job-requests/mine")
      .then((res) => res.json())
      .then((data: { requests: MyRequestItem[] }) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]));
  }, []);

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
      {requests.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-zinc-900 dark:text-zinc-50">{r.description}</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                r.status === "CLAIMED"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {r.status === "CLAIMED" ? "Claimed" : "Waiting for a technician"}
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

          {r.claimedBy && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <Avatar name={r.claimedBy.user.name} seed={r.claimedBy.avatarSeed} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {r.claimedBy.user.name}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{r.claimedBy.headline}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <VerificationBadge tier={r.claimedBy.verificationTier} compact />
                  <RatingStars ratingAvg={r.claimedBy.ratingAvg} ratingCount={r.claimedBy.ratingCount} />
                </div>
              </div>
              <Link
                href={`/workers/${r.claimedBy.id}`}
                className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
              >
                View profile
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
