import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/geo";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/sos/[id]
 *
 * Polled by the customer's waiting-room UI (components/sos/SosTrigger.tsx)
 * as a fallback to the socket "sos:accepted" push, and usable by an
 * alerted worker reconnecting after a dropped connection. Shows only
 * what each side is allowed to see — same "reveal on commit" shape as
 * bookings: a worker never gets the customer's exact coordinates until
 * they've actually accepted (see accept/route.ts), just how far away.
 */
export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const sos = await prisma.sosRequest.findUnique({ where: { id } });
    if (!sos) {
      return Response.json({ error: "SOS request not found." }, { status: 404 });
    }

    if (sos.customerId === session.user.id) {
      return Response.json({
        sos: {
          id: sos.id,
          status: sos.status,
          radiusKm: sos.radiusKm,
          alertedWorkerCount: sos.alertedWorkerIds.length,
          bookingId: sos.bookingId,
          createdAt: sos.createdAt,
        },
      });
    }

    const worker = await prisma.worker.findUnique({
      where: { userId: session.user.id },
      select: { id: true, currentLat: true, currentLng: true },
    });
    const isAlerted = Boolean(worker && sos.alertedWorkerIds.includes(worker.id));
    if (!worker || !isAlerted) {
      return Response.json({ error: "SOS request not found." }, { status: 404 });
    }

    const distance =
      worker.currentLat != null && worker.currentLng != null
        ? Math.round(distanceKm(sos.lat, sos.lng, worker.currentLat, worker.currentLng) * 10) / 10
        : null;

    return Response.json({
      sos: {
        id: sos.id,
        status: sos.status,
        distanceKm: distance,
        isMine: sos.acceptedWorkerId === worker.id,
        bookingId: sos.acceptedWorkerId === worker.id ? sos.bookingId : null,
        createdAt: sos.createdAt,
      },
    });
  }
);
