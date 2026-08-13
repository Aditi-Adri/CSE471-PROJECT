import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/job-requests/mine
 *
 * The requests the signed-in user has posted themselves — every
 * status, not just OPEN (see GET /api/job-requests, the worker-facing
 * browse list, which is the opposite: OPEN-only, not scoped to a
 * customer). When one's been claimed, this is also how the customer
 * finds out and sees who claimed it — no separate notification system
 * exists (that's Module 3's real-time chat/notifications, unbuilt);
 * checking this page is the notification, for now.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const requests = await prisma.jobRequest.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      description: true,
      area: true,
      budgetMinBdt: true,
      budgetMaxBdt: true,
      status: true,
      createdAt: true,
      claimedAt: true,
      claimedBy: {
        select: {
          id: true,
          headline: true,
          verificationTier: true,
          ratingAvg: true,
          ratingCount: true,
          avatarSeed: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return Response.json({ requests });
});
