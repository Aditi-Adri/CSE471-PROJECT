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

export function computeReviewEligibility(
  booking: Pick<Booking, "status" | "completedAt">,
  hasExistingReview: boolean,
  now: Date = new Date()
): ReviewEligibility {
  if (booking.status !== "COMPLETED" || !booking.completedAt) {
    return { eligible: false, reason: "not_completed", deadline: null };
  }

  const deadline = new Date(booking.completedAt.getTime() + REVIEW_WINDOW_MS);

  if (hasExistingReview) {
    return { eligible: false, reason: "already_reviewed", deadline };
  }

  if (now > deadline) {
    return { eligible: false, reason: "window_expired", deadline };
  }

  return { eligible: true, deadline };
}
