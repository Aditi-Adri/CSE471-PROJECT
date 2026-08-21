import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/corporate/billing
 *
 * MODULE 3 -> FEATURE 3 (Corporate Portal): aggregated monthly invoice
 * for the signed-in CORPORATE user. Sums `agreedRateBdt` for all
 * bookings where `isCorporateBill = true`, `status = COMPLETED`,
 * `customerId = session.user.id`, and `completedAt` falls within the
 * current calendar month (UTC).
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "CORPORATE") {
    return Response.json({ error: "This endpoint is for corporate accounts." }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: session.user.id,
      isCorporateBill: true,
      status: "COMPLETED",
      completedAt: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      serviceAddress: true,
      agreedRateBdt: true,
      completedAt: true,
      workerId: true,
      corporatePropertyId: true,
    },
  });

  const totalSpent = bookings.reduce((sum, b) => sum + (b.agreedRateBdt ?? 0), 0);
  const completedJobs = bookings.length;

  // Resolve property labels for the breakdown view.
  const propertyIds = [
    ...new Set(bookings.map((b) => b.corporatePropertyId).filter((id): id is string => Boolean(id))),
  ];
  const properties = propertyIds.length
    ? await prisma.corporateProperty.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, label: true },
      })
    : [];
  const labelById = new Map(properties.map((p) => [p.id, p.label]));

  // Resolve worker names for the breakdown view.
  const workerIds = [
    ...new Set(bookings.map((b) => b.workerId).filter((id): id is string => Boolean(id))),
  ];
  const workers = workerIds.length
    ? await prisma.worker.findMany({
        where: { id: { in: workerIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const workerNameById = new Map(workers.map((w) => [w.id, w.user.name]));

  const breakdown = bookings.map((b) => ({
    id: b.id,
    propertyLabel: (b.corporatePropertyId && labelById.get(b.corporatePropertyId)) || "Unknown",
    serviceAddress: b.serviceAddress,
    workerName: (b.workerId && workerNameById.get(b.workerId)) || "Technician",
    amount: b.agreedRateBdt ?? 0,
    completedAt: b.completedAt,
  }));

  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return Response.json({ totalSpent, completedJobs, monthLabel, breakdown });
});
