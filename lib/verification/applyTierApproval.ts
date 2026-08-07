import { prisma } from "@/lib/db";
import { TIER_RANK } from "@/lib/search/buildWorkerQuery";
import { highestApprovedTier } from "./tierGating";
import { getWorkerTierSnapshot } from "./getTierSnapshot";

/**
 * Re-derives Worker.verificationTier from the three tier submissions'
 * current statuses and bumps it if the newly-computed tier outranks
 * what's stored. Called after every review decision so the badge shown
 * in search results and on the profile page — which
 * lib/search/buildWorkerQuery.ts ranks and filters on directly —
 * reflects reality immediately, and never downgrades a worker based on
 * a stale read.
 */
export async function syncWorkerVerificationTier(workerId: string): Promise<void> {
  const [worker, snapshot] = await Promise.all([
    prisma.worker.findUniqueOrThrow({ where: { id: workerId }, select: { verificationTier: true } }),
    getWorkerTierSnapshot(workerId),
  ]);
  const computedTier = highestApprovedTier(snapshot);

  if (TIER_RANK[computedTier] > TIER_RANK[worker.verificationTier]) {
    await prisma.worker.update({ where: { id: workerId }, data: { verificationTier: computedTier } });
  }
}
