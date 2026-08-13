import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/bookings/mine
 *
 * A customer's booking requests, or (if the signed-in user is a
 * worker) the jobs assigned to them — same booking rows, shaped
 * differently depending which side is asking. `Booking.customerId`/
 * `workerId` are plain strings, not Prisma relations (this table
 * predates real accounts on both ends — see docs/FEATURE_SPEC.md), so
 * the other party's display name is joined manually below rather than
 * via `include`.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  if (session.user.role === "WORKER") {
    const worker = await prisma.worker.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!worker) {
      return Response.json({ bookings: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: { workerId: worker.id },
      orderBy: { createdAt: "desc" },
    });
    const customerIds = [...new Set(bookings.map((b) => b.customerId))];
    const customers = await prisma.user.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(customers.map((c) => [c.id, c.name]));

    return Response.json({
      bookings: bookings.map((b) => ({
        ...shapeBookingForViewer(b, "worker"),
        counterpartyName: nameById.get(b.customerId) ?? "Customer",
      })),
    });
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const workerIds = [...new Set(bookings.map((b) => b.workerId).filter((id): id is string => Boolean(id)))];
  const workers = await prisma.worker.findMany({
    where: { id: { in: workerIds } },
    select: { id: true, user: { select: { name: true } } },
  });
  const nameById = new Map(workers.map((w) => [w.id, w.user.name]));

  return Response.json({
    bookings: bookings.map((b) => ({
      ...shapeBookingForViewer(b, "customer"),
      counterpartyName: (b.workerId && nameById.get(b.workerId)) ?? "Technician",
    })),
  });
});
