import { prisma } from "@/lib/db";
import { computeTrustScore, type TrustBreakdown } from "./trustScoreMath";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): AI TrustScore Engine — the DB-touching
 * half. Pulls every input trustScoreMath.ts needs straight from the
 * database and recomputes the composite. See the banner comment above
 * Worker.trustScore in prisma/schema.prisma for why it's cached rather
 * than computed per-request.
 *
 * Two entry points sharing one query set (loadTrustInputs):
 *   - recomputeTrustScore: writes the result back to Worker. Called
 *     after anything that changes an input — a review is
 *     submitted/hidden/unhidden (app/api/bookings/[id]/review,
 *     app/api/admin/reviews), a worker responds to a booking
 *     (app/api/bookings/[id]/respond), a job completes
 *     (app/api/bookings/[id]/complete), a verification tier bumps
 *     (app/api/admin/verifications/tier{1,2,3}), or a Worker row is
 *     first created (app/api/worker-profile).
 *   - getTrustBreakdown: read-only, no write — for a page that wants
 *     the full 6-metric breakdown (app/workers/[id]) without turning a
 *     GET into a write on every profile view.
 *
 * recomputeTrustScore is also the moment
 * Worker.ratingAvg/ratingCount/completedJobs go from "seeded demo
 * numbers" to "derived from real Review/Booking rows" — they're
 * refreshed here alongside trustScore rather than tracked as separate
 * counters, so they can never drift from what the database actually
 * contains (e.g. an admin hiding a fraudulent review immediately pulls
 * it back out of the average, not just out of the trust score).
 */

const POST_ACCEPTANCE_STATUSES = ["CONFIRMED", "ARRIVED", "COMPLETED", "CANCELLED"] as const;

// Bounded so one worker with thousands of historical bookings can't
// make this an unbounded scan — recent responsiveness is what matters,
// and 200 is already far more than enough to average out noise.
const MAX_RESPONSE_SAMPLES = 200;

async function loadTrustInputs(workerId: string) {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { verificationTier: true },
  });
  if (!worker) return null;

  const [reviews, postAcceptanceCount, completedCount, respondedBookings] = await Promise.all([
    prisma.review.findMany({
      where: { workerId, isHidden: false },
      select: { rating: true, fraudFlagged: true },
    }),
    prisma.booking.count({ where: { workerId, status: { in: [...POST_ACCEPTANCE_STATUSES] } } }),
    prisma.booking.count({ where: { workerId, status: "COMPLETED" } }),
    prisma.booking.findMany({
      where: { workerId, respondedAt: { not: null } },
      select: { createdAt: true, respondedAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESPONSE_SAMPLES,
    }),
  ]);

  const authenticReviews = reviews.filter((r) => !r.fraudFlagged);
  const ratingAvg =
    authenticReviews.length > 0
      ? authenticReviews.reduce((sum, r) => sum + r.rating, 0) / authenticReviews.length
      : 0;

  const avgResponseMinutes =
    respondedBookings.length > 0
      ? respondedBookings.reduce(
          (sum, b) => sum + (b.respondedAt!.getTime() - b.createdAt.getTime()) / 60_000,
          0
        ) / respondedBookings.length
      : null;

  return {
    verificationTier: worker.verificationTier,
    ratingAvg,
    authenticReviewCount: authenticReviews.length,
    fraudFlaggedCount: reviews.filter((r) => r.fraudFlagged).length,
    totalNonHiddenReviewCount: reviews.length,
    completedCount,
    postAcceptanceCount,
    avgResponseMinutes,
  };
}

/** Read-only — for display (app/workers/[id]'s trust breakdown panel). Never writes. */
export async function getTrustBreakdown(workerId: string): Promise<TrustBreakdown | null> {
  const inputs = await loadTrustInputs(workerId);
  return inputs ? computeTrustScore(inputs) : null;
}

/** Writes the recomputed score (+ ratingAvg/ratingCount/completedJobs) back to Worker. */
export async function recomputeTrustScore(workerId: string): Promise<TrustBreakdown | null> {
  const inputs = await loadTrustInputs(workerId);
  if (!inputs) return null;

  const breakdown = computeTrustScore(inputs);

  await prisma.worker.update({
    where: { id: workerId },
    data: {
      trustScore: breakdown.total,
      trustScoreUpdatedAt: new Date(),
      ratingAvg: Math.round(inputs.ratingAvg * 10) / 10,
      ratingCount: inputs.authenticReviewCount,
      completedJobs: inputs.completedCount,
    },
  });

  return breakdown;
}
