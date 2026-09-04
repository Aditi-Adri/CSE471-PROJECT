import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// GET /api/job-requests/mine
//
// The requests the signed-in customer has posted themselves, every
// status. While OPEN, the customer sees every applicant here and
// picks one to hire. Once HIRED, this also shows who they hired and
// the total bill (wage + any parts bought for the job).
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
      partOrders: {
        select: { items: { select: { quantity: true, price: true } } },
      },
    },
  });

  // For each request, work out the parts total and, once hired, the
  // combined bill (wage + parts).
  const shapedRequests = [];
  for (const request of requests) {
    // Add up every part ever bought for this job.
    let partsTotalBdt = 0;
    for (const order of request.partOrders) {
      for (const item of order.items) {
        partsTotalBdt += item.quantity * item.price;
      }
    }

    // Find the wage from the application that actually got hired.
    let wageBdt = null;
    for (const application of request.applications) {
      if (application.worker.id === request.hiredWorker?.id) {
        wageBdt = application.wageBdt;
      }
    }

    let totalBillBdt = null;
    if (wageBdt !== null) {
      totalBillBdt = wageBdt + partsTotalBdt;
    }

    shapedRequests.push({
      id: request.id,
      description: request.description,
      area: request.area,
      budgetMinBdt: request.budgetMinBdt,
      budgetMaxBdt: request.budgetMaxBdt,
      status: request.status,
      createdAt: request.createdAt,
      hiredAt: request.hiredAt,
      hiredWorker: request.hiredWorker,
      applications: request.applications,
      partsTotalBdt,
      wageBdt,
      totalBillBdt,
    });
  }

  return Response.json({ requests: shapedRequests });
});
