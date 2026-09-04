import type { Booking } from "@/app/generated/prisma/client";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): reviews are restricted to verified
 * completions within a 72h window.
 *
 * The pure half — no `@/lib/db` import on purpose, same reason
 * lib/opportunities/demandScoreMath.ts keeps query-building separate
 * from the Prisma client: it's what makes this file's test runnable
 * with no database/env setup at all. See reviewEligibility.ts for the
 * part that actually loads the booking and calls this.
 */

export const REVIEW_WINDOW_HOURS = 72;
export const REVIEW_WINDOW_MS = REVIEW_WINDOW_HOURS * 60 * 60 * 1000;

export type ReviewEligibilityReason = "not_completed" | "already_reviewed" | "window_expired";

export type ReviewEligibility =
  | { eligible: true; deadline: Date }
  | { eligible: false; reason: ReviewEligibilityReason; deadline: Date | null };

/**
 * Three gates, checked in order. `now` is a parameter (not read from
 * the clock inside) so the tests can check the exact 72h boundary.
 */
export function computeReviewEligibility(
  booking: Pick<Booking, "status" | "completedAt">,
  hasExistingReview: boolean,
  now: Date = new Date()
): ReviewEligibility {
  // Gate 1: the job must really be finished — status comes from the
  // database, not from the customer saying so.
  if (booking.status !== "COMPLETED" || !booking.completedAt) {
    return { eligible: false, reason: "not_completed", deadline: null };
  }

  // The clock runs from completion, not from booking time.
  const deadline = new Date(booking.completedAt.getTime() + REVIEW_WINDOW_MS);

  // Gate 2: one review per job.
  if (hasExistingReview) {
    return { eligible: false, reason: "already_reviewed", deadline };
  }

  // Gate 3: still inside the 72-hour window.
  if (now > deadline) {
    return { eligible: false, reason: "window_expired", deadline };
  }

  return { eligible: true, deadline };
}
