import { prisma } from "@/lib/db";
import { computeReviewEligibility, type ReviewEligibility } from "./reviewEligibilityMath";

export * from "./reviewEligibilityMath";

/**
 * DB-touching wrapper — loads the booking's existing review (if any)
 * and applies computeReviewEligibility. Used by both the GET (drives
 * the review-form UI) and POST (the actual submit) on
 * app/api/bookings/[id]/review/route.ts, so eligibility can never be
 * checked one way for the UI and another for the write.
 */
export async function getReviewEligibilityForBooking(bookingId: string): Promise<ReviewEligibility> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, completedAt: true, review: { select: { id: true } } },
  });
  if (!booking) {
    return { eligible: false, reason: "not_completed", deadline: null };
  }
  return computeReviewEligibility(booking, Boolean(booking.review));
}
