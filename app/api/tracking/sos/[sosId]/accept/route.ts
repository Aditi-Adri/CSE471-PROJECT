import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/tracking/sos/[sosId]/accept
 * body: { workerId: string, etaMinutes?: number }
 *
 * Marks an SOS request as ACCEPTED by a given worker.
 *
 * This used to accept any `workerId` string from an unauthenticated
 * request — anyone could "accept" any SOS as any worker. `WorkerLocation`
 * isn't foreign-keyed to a real User (it's seeded demo data, see
 * docs/FEATURE_SPEC.md), so this can't fully verify the caller *is*
 * that worker — but it now requires a real signed-in Worker account,
 * and requires `workerId` to actually be one of the workers this SOS
 * paged (`alertedWorkerIds`), not an arbitrary string.
 */
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ sosId: string }> }) => {
    const { sosId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }
    if (session.user.role !== "WORKER") {
      return Response.json({ error: "Only worker accounts can accept an SOS." }, { status: 403 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`sos-accept:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const workerId = body?.workerId;
    const etaMinutes = typeof body?.etaMinutes === "number" ? body.etaMinutes : 5;
    if (!workerId) {
      return Response.json({ error: "workerId is required" }, { status: 400 });
    }

    const existingSos = await prisma.sosRequest.findUnique({ where: { id: sosId } });
    if (!existingSos) {
      return Response.json({ error: "SOS request not found" }, { status: 404 });
    }

    // Guard against race conditions if another worker accepted first
    if (existingSos.status === "ACCEPTED") {
      return Response.json(
        { error: "SOS request has already been accepted by another worker" },
        { status: 409 }
      );
    }

    if (!existingSos.alertedWorkerIds.includes(workerId)) {
      return Response.json(
        { error: "This SOS request wasn't sent to that worker." },
        { status: 403 }
      );
    }

    const worker = await prisma.workerLocation.findUnique({ where: { workerId } });

    const updatedSos = await prisma.sosRequest.update({
      where: { id: sosId },
      data: {
        status: "ACCEPTED",
        acceptedWorkerId: workerId,
        etaMinutes,
      },
    });

    return Response.json(
      {
        sosId: updatedSos.id,
        workerId: updatedSos.acceptedWorkerId,
        etaMinutes: updatedSos.etaMinutes,
        worker: worker
          ? {
              name: worker.name,
              role: worker.role,
              rating: worker.rating,
              avatarInitials: worker.avatarInitials || worker.name.slice(0, 2).toUpperCase(),
            }
          : { name: "Verified Worker", role: "Technician", rating: 5.0, avatarInitials: "VW" },
        workerLocation: worker ? { lat: worker.lat, lng: worker.lng } : null,
      },
      { status: 200 }
    );
  }
);
