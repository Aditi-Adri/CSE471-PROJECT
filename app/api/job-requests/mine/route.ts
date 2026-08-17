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
 * customer). While OPEN, this is where the customer reviews every
 * applicant's profile and picks one via POST .../hire — "using his
 * profile and everything." Once HIRED, it's how the customer finds
 * out and sees who they hired — no separate notification system
 * exists (that's Module 3's real-time chat/notifications, unbuilt);
 * checking this page is the notification, for now.
 */
const applicantWorkerSelect = {
  id: true,
  headline: true,
  verificationTier: true,
  ratingAvg: true,
  ratingCount: true,
  avatarSeed: true,
  user: { select: { name: true } },
} as const;

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
      hiredAt: true,
      hiredWorker: { select: applicantWorkerSelect },
      applications: {
        orderBy: { appliedAt: "asc" },
        select: { id: true, wageBdt: true, appliedAt: true, worker: { select: applicantWorkerSelect } },
      },
      // Once hired, the customer's bill = the hired worker's wage +
      // whatever parts they bought for this job.
      partOrders: {
        select: { items: { select: { quantity: true, price: true } } },
      },
    },
  });

  const shaped = requests.map(({ partOrders, applications, ...r }) => {
    const partsTotalBdt = partOrders
      .flatMap((o) => o.items)
      .reduce((sum, item) => sum + item.quantity * item.price, 0);
    const hiredApplication = applications.find((a) => a.worker.id === r.hiredWorker?.id);
    const wageBdt = hiredApplication?.wageBdt ?? null;

    return {
      ...r,
      applications,
      partsTotalBdt,
      wageBdt,
      totalBillBdt: wageBdt !== null ? wageBdt + partsTotalBdt : null,
    };
  });

  return Response.json({ requests: shaped });
});
