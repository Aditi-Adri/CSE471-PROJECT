import type { VerificationTier } from "@/app/generated/prisma/client";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): AI TrustScore Engine.
 *
 * The pure half of the scoring logic — no `@/lib/db` import on purpose,
 * same reason lib/opportunities/demandScoreMath.ts and
 * lib/search/buildWorkerQuery.ts keep query-building separate from the
 * Prisma client: it's what makes trustScoreMath.test.ts runnable with
 * no database/env setup at all. See recomputeTrustScore.ts for the part
 * that actually queries the database and calls this.
 *
 * Six weighted metrics, each normalized to 0-100, combined into one
 * cached 0-100 composite (Worker.trustScore):
 *
 *   1. Rating quality      — how good the (authentic) reviews are.
 *   2. Completion reliability — of the jobs this worker actually
 *      committed to (accepted), how many they saw through to done.
 *   3. Verification trust  — the Module 1 F1 badge tier, partial
 *      credit even before Tier 1 so a brand-new worker isn't at zero.
 *   4. Responsiveness      — how quickly they respond to a booking
 *      request (accept, reject, or counter — any of the three counts).
 *   5. Review authenticity — the inverse of how much of their review
 *      pile the fraud detector has flagged.
 *   6. Review volume       — a confidence signal: a 5.0 average from
 *      one review means less than a 4.6 average from twenty.
 *
 * A metric with genuinely no data yet (new worker, no responses, no
 * reviews) gets a neutral baseline rather than 0 or 100 — "unproven"
 * shouldn't score the same as "proven bad" or "proven great".
 */

export const TRUST_WEIGHTS = {
  ratingQuality: 0.3,
  completionReliability: 0.2,
  verificationTrust: 0.15,
  responsiveness: 0.15,
  reviewAuthenticity: 0.1,
  reviewVolume: 0.1,
} as const;

/** Sanity-checked at import time — the weights above must sum to 1. */
const WEIGHT_SUM = Object.values(TRUST_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`TRUST_WEIGHTS must sum to 1, got ${WEIGHT_SUM}`);
}

const VERIFICATION_TRUST_SCORE: Record<VerificationTier, number> = {
  UNVERIFIED: 25,
  TIER1_ID_VERIFIED: 55,
  TIER2_SKILL_TESTED: 80,
  TIER3_POLICE_CLEARED: 100,
};

/** Authentic reviews needed before the volume metric maxes out. */
const REVIEW_VOLUME_CAP = 15;

/** Average response time (minutes) at which the responsiveness metric halves. */
const RESPONSE_HALF_LIFE_MINUTES = 60;

/** Used for any metric with no data yet — "unproven", not "bad". */
const NO_DATA_BASELINE = 60;

export type TrustMetricInputs = {
  /** Mean star rating (1-5) across authentic (non-fraud-flagged, non-hidden) reviews. Ignored if authenticReviewCount is 0. */
  ratingAvg: number;
  authenticReviewCount: number;
  /** Fraud-flagged reviews among all non-hidden reviews (flagged ones stay visible, see docs/FEATURE_SPEC.md). */
  fraudFlaggedCount: number;
  /** All non-hidden reviews, flagged or not. */
  totalNonHiddenReviewCount: number;
  /** COMPLETED bookings. */
  completedCount: number;
  /** Bookings this worker actually committed to (CONFIRMED/ARRIVED/COMPLETED/CANCELLED-after-accept) — the denominator for reliability. */
  postAcceptanceCount: number;
  verificationTier: VerificationTier;
  /** Mean minutes between a booking request and this worker's first response. Null = no responses yet. */
  avgResponseMinutes: number | null;
};

export type TrustBreakdown = {
  ratingQuality: number;
  completionReliability: number;
  verificationTrust: number;
  responsiveness: number;
  reviewAuthenticity: number;
  reviewVolume: number;
  /** The cached composite — this is what Worker.trustScore stores. */
  total: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeTrustScore(inputs: TrustMetricInputs): TrustBreakdown {
  const ratingQuality =
    inputs.authenticReviewCount > 0
      ? clamp(((inputs.ratingAvg - 1) / 4) * 100, 0, 100)
      : NO_DATA_BASELINE;

  const completionReliability =
    inputs.postAcceptanceCount > 0
      ? clamp((inputs.completedCount / inputs.postAcceptanceCount) * 100, 0, 100)
      : NO_DATA_BASELINE;

  const verificationTrust = VERIFICATION_TRUST_SCORE[inputs.verificationTier];

  const responsiveness =
    inputs.avgResponseMinutes == null
      ? NO_DATA_BASELINE
      : clamp(100 * Math.pow(0.5, inputs.avgResponseMinutes / RESPONSE_HALF_LIFE_MINUTES), 0, 100);

  // No reviews at all isn't "unproven" here the way the other metrics
  // treat it — nothing has ever been flagged, which is a genuine (if
  // thin) positive fact, not a missing one. Starts at 100, only comes
  // down as fraud flags actually accumulate.
  const reviewAuthenticity =
    inputs.totalNonHiddenReviewCount > 0
      ? clamp(100 - (inputs.fraudFlaggedCount / inputs.totalNonHiddenReviewCount) * 100, 0, 100)
      : 100;

  const reviewVolume = clamp(
    (100 * Math.log(1 + inputs.authenticReviewCount)) / Math.log(1 + REVIEW_VOLUME_CAP),
    0,
    100
  );

  const total =
    ratingQuality * TRUST_WEIGHTS.ratingQuality +
    completionReliability * TRUST_WEIGHTS.completionReliability +
    verificationTrust * TRUST_WEIGHTS.verificationTrust +
    responsiveness * TRUST_WEIGHTS.responsiveness +
    reviewAuthenticity * TRUST_WEIGHTS.reviewAuthenticity +
    reviewVolume * TRUST_WEIGHTS.reviewVolume;

  return {
    ratingQuality: round1(ratingQuality),
    completionReliability: round1(completionReliability),
    verificationTrust: round1(verificationTrust),
    responsiveness: round1(responsiveness),
    reviewAuthenticity: round1(reviewAuthenticity),
    reviewVolume: round1(reviewVolume),
    total: round1(clamp(total, 0, 100)),
  };
}
