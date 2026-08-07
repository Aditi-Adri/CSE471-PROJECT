"use client";

import { useCallback, useEffect, useState } from "react";
import { canRequestTier2, canSubmitTier1, canSubmitTier3, type WorkerTierSnapshot } from "@/lib/verification/tierGating";
import { VERIFICATION_TIERS } from "@/lib/constants/dhakaAreas";
import type { VerificationTier } from "@/app/generated/prisma/client";
import { Tier1Panel } from "./Tier1Panel";
import { Tier2Panel } from "./Tier2Panel";
import { Tier3Panel } from "./Tier3Panel";
import { TierProgress } from "./TierProgress";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

type WorkerStatus = {
  id: string;
  verificationTier: VerificationTier;
  tier1Verification: { status: ReviewStatus; autoApproved: boolean; reviewNote: string | null } | null;
  tier2SkillTest: { status: ReviewStatus; evaluatorNote: string | null } | null;
  tier3PoliceClearance: {
    status: ReviewStatus;
    reviewNote: string | null;
    references: { id: string; name: string; contacted: boolean; verified: boolean }[];
  } | null;
};

export function VerificationDashboard() {
  const [worker, setWorker] = useState<WorkerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // No synchronous setLoading(true) here on purpose — a resubmit-triggered
  // refetch should swap in fresh data quietly, not flash the skeleton
  // again. The initial `true` from useState covers first mount.
  const refetch = useCallback(() => {
    return fetch("/api/verification/status")
      .then((res) => res.json())
      .then((data) => setWorker(data.worker ?? null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading || !worker) {
    return <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const snapshot: WorkerTierSnapshot = {
    tier1: worker.tier1Verification?.status ?? null,
    tier2: worker.tier2SkillTest?.status ?? null,
    tier3: worker.tier3PoliceClearance?.status ?? null,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your verification progress</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Current badge:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {VERIFICATION_TIERS.find((t) => t.value === worker.verificationTier)?.label}
          </span>
        </p>
        <TierProgress currentTier={worker.verificationTier} />
      </div>

      <Tier1Panel status={worker.tier1Verification} canSubmit={canSubmitTier1(snapshot)} onSubmitted={refetch} />
      <Tier2Panel
        status={worker.tier2SkillTest}
        unlocked={snapshot.tier1 === "APPROVED"}
        canSubmit={canRequestTier2(snapshot)}
        onSubmitted={refetch}
      />
      <Tier3Panel
        status={worker.tier3PoliceClearance}
        unlocked={snapshot.tier2 === "APPROVED"}
        canSubmit={canSubmitTier3(snapshot)}
        onSubmitted={refetch}
      />
    </div>
  );
}
