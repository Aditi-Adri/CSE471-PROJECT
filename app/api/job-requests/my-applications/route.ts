import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/job-requests/my-applications
 *
 * The signed-in worker's own applications — every request they've
 * applied to, newest first. This is the worker's side of the
 * "notification": once a request they applied to flips to HIRED, this
 * page shows whether they were the one picked, and if so, the
 * customer's name and phone number so they can actually get in touch —
 * withheld otherwise, same "don't hand out contact info before there's
 * a real match" posture the booking flow uses for the customer's
 * address.
 */
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

  const shaped = applications.map(({ jobRequest, ...application }) => {
    const hired = jobRequest.hiredWorkerId === worker.id;
    const partsTotalBdt = jobRequest.partOrders
      .flatMap((o) => o.items)
      .reduce((sum, item) => sum + item.quantity * item.price, 0);

    return {
      ...application,
      jobRequest: {
        id: jobRequest.id,
        description: jobRequest.description,
        area: jobRequest.area,
        budgetMinBdt: jobRequest.budgetMinBdt,
        budgetMaxBdt: jobRequest.budgetMaxBdt,
        status: jobRequest.status,
        createdAt: jobRequest.createdAt,
        hiredAt: jobRequest.hiredAt,
        hired,
        // Only reveal the customer once *this* worker is the one hired —
        // everyone else who applied just sees the request went to
        // someone else, not who or how to reach them.
        customer: hired ? jobRequest.customer : null,
        partsTotalBdt,
        totalBillBdt: application.wageBdt + partsTotalBdt,
      },
    };
  });

  return Response.json({ applications: shaped });
});
