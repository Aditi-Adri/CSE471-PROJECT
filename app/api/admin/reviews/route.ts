import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { recomputeTrustScore } from "@/lib/trust/recomputeTrustScore";
import { moderateReviewSchema } from "@/lib/validation/reviewSchema";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): AI TrustScore Engine + Review Fraud
 * Detection — the admin moderation queue behind app/admin/reviews.
 *
 * GET  — every review, fraud-flagged ones first (that's what actually
 *        needs a human decision; a clean review just needs to exist).
 * POST — hide/unhide. A flag isn't proof (see the banner comment above
 *        model Review in prisma/schema.prisma) — this is the actual
 *        human confirmation step. Hiding never deletes the row; it
 *        only drops the review out of the public list and every
 *        trust-score metric (recomputeTrustScore re-derives
 *        ratingAvg/ratingCount/trustScore right after, same as every
 *        other trigger).
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const reviews = await prisma.review.findMany({
    orderBy: [{ fraudFlagged: "desc" }, { createdAt: "desc" }],
    include: {
      customer: { select: { name: true, email: true } },
      worker: { select: { id: true, headline: true, user: { select: { name: true } } } },
    },
  });

  return Response.json({ reviews });
});

export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = moderateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { reviewId, action } = parsed.data;

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { workerId: true } });
  if (!review) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden: action === "hide" },
  });
  await recomputeTrustScore(review.workerId);

  return Response.json({ status: action });
});
