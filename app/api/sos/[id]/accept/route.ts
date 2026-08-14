import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/geo";
import { estimateEtaMinutesFallback } from "@/lib/eta";
import { generateOtp } from "@/lib/booking/bookingFlow";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { getIO } from "@/lib/socketServer";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/sos/[id]/accept
 *
 * First alerted worker to hit this wins — the `updateMany` with
 * `status: "PENDING"` in the WHERE clause is the race guard (an
 * unconditional findUnique-then-update would let two workers who both
 * read PENDING before either wrote both "win"). Winning creates a real
 * Booking already CONFIRMED with a live arrival code, exactly like a
 * normal accepted booking — the customer's SOS waiting screen redirects
 * straight to it once "sos:accepted" arrives, and from there it's the
 * same live-tracking map as any other confirmed job.
 */
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

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

    const worker = await prisma.worker.findUnique({ where: { userId: session.user.id } });
    if (!worker) {
      return Response.json({ error: "Set up your worker profile first." }, { status: 404 });
    }

    const sos = await prisma.sosRequest.findUnique({ where: { id } });
    if (!sos) {
      return Response.json({ error: "SOS request not found." }, { status: 404 });
    }
    if (!sos.alertedWorkerIds.includes(worker.id)) {
      return Response.json({ error: "This SOS request wasn't sent to you." }, { status: 403 });
    }

    const etaMinutes =
      worker.currentLat != null && worker.currentLng != null
        ? estimateEtaMinutesFallback(distanceKm(worker.currentLat, worker.currentLng, sos.lat, sos.lng))
        : null;

    const claim = await prisma.sosRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedWorkerId: worker.id, acceptedAt: new Date(), etaMinutes },
    });
    if (claim.count === 0) {
      return Response.json({ error: "Someone else already responded to this emergency." }, { status: 409 });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: sos.customerId,
        customerPhone: sos.customerPhone,
        workerId: worker.id,
        status: "CONFIRMED",
        destinationLat: sos.lat,
        destinationLng: sos.lng,
        serviceAddress: "Emergency SOS request — no typed address, follow the map pin.",
        arrivalCode: generateOtp(),
        etaMinutes: etaMinutes ?? undefined,
      },
    });

    await prisma.sosRequest.update({ where: { id: sos.id }, data: { bookingId: booking.id } });

    const io = getIO();
    if (io) {
      io.to(`sos:${sos.id}`).emit("sos:accepted", { sosId: sos.id, bookingId: booking.id, etaMinutes });
      for (const otherWorkerId of sos.alertedWorkerIds) {
        if (otherWorkerId !== worker.id) {
          io.to(`worker:${otherWorkerId}`).emit("sos:taken", { sosId: sos.id });
        }
      }
    }

    return Response.json({ booking: shapeBookingForViewer(booking, "worker") });
  }
);
