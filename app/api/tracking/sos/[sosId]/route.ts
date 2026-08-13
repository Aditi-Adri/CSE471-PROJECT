import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { relativeKm } from "@/lib/geo";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/tracking/sos/[sosId]
 *
 * Returns the SOS request's current state, shaped to match the
 * "sos:accepted" socket payload emitted by the accept route. Requires
 * a signed-in session — this exposed a customer's live coordinates to
 * anyone who knew (or guessed) the sosId, no auth at all.
 */
export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ sosId: string }> }) => {
    const { sosId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const sos = await prisma.sosRequest.findUnique({ where: { id: sosId } });
    if (!sos) {
      return Response.json({ error: "SOS request not found" }, { status: 404 });
    }

    // Workers who were alerted, plotted on the radar relative to the customer.
    const alertedWorkers = sos.alertedWorkerIds?.length
      ? await prisma.workerLocation.findMany({
          where: { workerId: { in: sos.alertedWorkerIds } },
        })
      : [];

    let accepted = null;
    if (sos.status === "ACCEPTED" && sos.acceptedWorkerId) {
      const worker = await prisma.workerLocation.findUnique({
        where: { workerId: sos.acceptedWorkerId },
      });

      accepted = {
        sosId: sos.id,
        workerId: sos.acceptedWorkerId,
        etaMinutes: sos.etaMinutes,
        worker: worker
          ? {
              name: worker.name,
              role: worker.role,
              rating: worker.rating,
              avatarInitials: worker.avatarInitials || worker.name.slice(0, 2).toUpperCase(),
            }
          : null,
        workerLocation: worker ? { lat: worker.lat, lng: worker.lng } : null,
      };
    }

    return Response.json({
      sosId: sos.id,
      status: sos.status,
      radiusKm: sos.radiusKm,
      customerLocation: { lat: sos.lat, lng: sos.lng },
      alertedWorkerCount: sos.alertedWorkerIds?.length || 0,
      nearbyWorkers: alertedWorkers.map((w) => ({
        workerId: w.workerId,
        name: w.name,
        ...relativeKm({ lat: sos.lat, lng: sos.lng }, w),
      })),
      accepted,
      createdAt: sos.createdAt,
    });
  }
);
