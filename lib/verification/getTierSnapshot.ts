import { prisma } from "@/lib/db";
import type { WorkerTierSnapshot } from "./tierGating";

/** Fetches just the three tiers' current statuses for one worker — the input tierGating's pure functions need. */
export async function getWorkerTierSnapshot(workerId: string): Promise<WorkerTierSnapshot> {
  const [tier1, tier2, tier3] = await Promise.all([
    prisma.tier1Verification.findUnique({ where: { workerId }, select: { status: true } }),
    prisma.tier2SkillTest.findUnique({ where: { workerId }, select: { status: true } }),
    prisma.tier3PoliceClearance.findUnique({ where: { workerId }, select: { status: true } }),
  ]);

  return {
    tier1: tier1?.status ?? null,
    tier2: tier2?.status ?? null,
    tier3: tier3?.status ?? null,
  };
}
