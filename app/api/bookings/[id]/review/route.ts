import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { getReviewEligibilityForBooking } from "@/lib/trust/reviewEligibility";
import { detectReviewFraud } from "@/lib/trust/fraudDetector";
import { recomputeTrustScore } from "@/lib/trust/recomputeTrustScore";
import { submitReviewSchema } from "@/lib/validation/reviewSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): AI TrustScore Engine + Review Fraud
 * Detection.
 *
 * GET  /api/bookings/[id]/review — eligibility + the existing review
 *      (if any), for the customer-facing review form on
 *      app/bookings/[id] (components/reviews/ReviewForm.tsx).
 * POST /api/bookings/[id]/review — submit the one-time review. Runs
 *      the fraud check synchronously and recomputes the worker's
 *      cached trust score before responding.
 *
 * Customer-only in both directions — same "who's asking" pattern every
 * other booking route uses (loadBookingWithViewerRole), and the same
 * reason: a worker has nothing to gate here, only the customer who
 * made the booking can ever review it.
 */

export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || viewer !== "customer") {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }

    const [eligibility, review] = await Promise.all([
      getReviewEligibilityForBooking(booking.id),
      prisma.review.findUnique({
        where: { bookingId: booking.id },
        select: { id: true, rating: true, comment: true, createdAt: true },
      }),
    ]);

    return Response.json({ eligibility, review });
  }
);

export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`booking-review:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || viewer !== "customer") {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    if (!booking.workerId) {
      return Response.json({ error: "This booking has no assigned technician to review." }, { status: 409 });
    }

    const body = await request.json().catch(() => null);
    const parsed = submitReviewSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid review.", issues: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const eligibility = await getReviewEligibilityForBooking(booking.id);
    if (!eligibility.eligible) {
      return Response.json({ error: eligibilityErrorMessage(eligibility.reason) }, { status: 409 });
    }

    const { rating, comment } = parsed.data;
    const fraud = await detectReviewFraud({ rating, comment, workerId: booking.workerId });

    const review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId: session.user.id,
        workerId: booking.workerId,
        rating,
        comment,
        fraudFlagged: fraud.fraudFlagged,
        fraudScore: fraud.fraudScore,
        fraudReason: fraud.fraudReason,
        fraudMethod: fraud.fraudMethod,
      },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });

    await recomputeTrustScore(booking.workerId);

    return Response.json({ review }, { status: 201 });
  }
);

function eligibilityErrorMessage(reason: "not_completed" | "already_reviewed" | "window_expired"): string {
  switch (reason) {
    case "not_completed":
      return "This job isn't marked complete yet.";
    case "already_reviewed":
      return "You've already reviewed this booking.";
    case "window_expired":
      return "The 72-hour review window for this booking has closed.";
  }
}
