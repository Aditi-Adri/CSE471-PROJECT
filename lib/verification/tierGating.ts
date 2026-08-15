import type { TierReviewStatus } from "@/app/generated/prisma/client";

/**
 * `null` means "no submission row exists yet" — Tier1Verification /
 * Tier2SkillTest / Tier3PoliceClearance are 1:1-with-Worker rows that
 * simply don't exist before a first submission.
 */
export type TierStatus = TierReviewStatus | null;

export type WorkerTierSnapshot = {
  tier1: TierStatus;
  tier2: TierStatus;
  tier3: TierStatus;
};

/** A tier can be (re)submitted when it's never been submitted, or was rejected — not while pending review or already approved. */
export function canActOnTier(status: TierStatus): boolean {
  return status === null || status === "REJECTED";
}

/** A tier unlocks once the one before it is approved. Tier 1 has no prerequisite. */
export function isTierUnlocked(previousTierStatus: TierStatus): boolean {
  return previousTierStatus === "APPROVED";
}

export function canSubmitTier1(snapshot: WorkerTierSnapshot): boolean {
  return canActOnTier(snapshot.tier1);
}

export function canRequestTier2(snapshot: WorkerTierSnapshot): boolean {
  return isTierUnlocked(snapshot.tier1) && canActOnTier(snapshot.tier2);
}

export function canSubmitTier3(snapshot: WorkerTierSnapshot): boolean {
  return isTierUnlocked(snapshot.tier2) && canActOnTier(snapshot.tier3);
}

/** Highest tier whose status is APPROVED — mirrors what Worker.verificationTier should be set to. */
export function highestApprovedTier(
  snapshot: WorkerTierSnapshot
): "TIER3_POLICE_CLEARED" | "TIER2_SKILL_TESTED" | "TIER1_ID_VERIFIED" | "UNVERIFIED" {
  if (snapshot.tier3 === "APPROVED") return "TIER3_POLICE_CLEARED";
  if (snapshot.tier2 === "APPROVED") return "TIER2_SKILL_TESTED";
  if (snapshot.tier1 === "APPROVED") return "TIER1_ID_VERIFIED";
  return "UNVERIFIED";
}
