import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// GET /api/job-requests/my-applications
//
// The signed-in worker's own applications, newest first. There's no
// notification system, so this page is how a worker finds out
// whether they got hired. Once hired, the customer's name and phone
// number show up too — withheld from everyone who wasn't picked.
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ applications: [] });
  }

  const applications = await prisma.jobRequestApplication.findMany({
    where: { workerId: worker.id },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      wageBdt: true,
      appliedAt: true,
      jobRequest: {
        select: {
          id: true,
          description: true,
          area: true,
          budgetMinBdt: true,
          budgetMaxBdt: true,
          status: true,
          createdAt: true,
          hiredWorkerId: true,
          hiredAt: true,
          customer: { select: { name: true, phone: true } },
          partOrders: {
            where: { workerId: worker.id },
            select: { items: { select: { quantity: true, price: true } } },
          },
        },
      },
    },
  });

  const shapedApplications = [];
  for (const application of applications) {
    const jobRequest = application.jobRequest;
    const wasHired = jobRequest.hiredWorkerId === worker.id;

    // Add up whatever parts this worker bought for this job.
    let partsTotalBdt = 0;
    for (const order of jobRequest.partOrders) {
      for (const item of order.items) {
        partsTotalBdt += item.quantity * item.price;
      }
    }

    // Only reveal the customer's contact info once this worker is the
    // one who was actually hired — everyone else just sees the job
    // went to someone else.
    let customer = null;
    if (wasHired) {
      customer = jobRequest.customer;
    }

    shapedApplications.push({
      id: application.id,
      wageBdt: application.wageBdt,
      appliedAt: application.appliedAt,
      jobRequest: {
        id: jobRequest.id,
        description: jobRequest.description,
        area: jobRequest.area,
        budgetMinBdt: jobRequest.budgetMinBdt,
        budgetMaxBdt: jobRequest.budgetMaxBdt,
        status: jobRequest.status,
        createdAt: jobRequest.createdAt,
        hiredAt: jobRequest.hiredAt,
        hired: wasHired,
        customer,
        partsTotalBdt,
        totalBillBdt: application.wageBdt + partsTotalBdt,
      },
    });
  }

  return Response.json({ applications: shapedApplications });
});
