import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/tracking/[bookingId]
 *
 * Returns the current booking status, ETA, and (if assigned) the
 * technician's last known location, for the /track/[bookingId] page's
 * initial load / refresh. Requires a signed-in session — this was
 * fully public before, so anyone who knew (or guessed) a bookingId
 * could watch a live tracking session with no auth at all.
 */
export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ bookingId: string }> }) => {
    const { bookingId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    let worker = null;
    if (booking.workerId) {
      worker = await prisma.workerLocation.findUnique({ where: { workerId: booking.workerId } });
    }

    return Response.json({
      id: booking.id,
      status: booking.status,
      etaMinutes: booking.etaMinutes,
      tenMinuteAlertSent: booking.tenMinuteAlertSent,
      destination: {
        lat: booking.destinationLat,
        lng: booking.destinationLng,
      },
      worker: worker
        ? {
            id: worker.workerId,
            name: worker.name,
            role: worker.role,
            rating: worker.rating,
            avatarInitials: worker.avatarInitials,
            lat: worker.lat,
            lng: worker.lng,
          }
        : null,
    });
  }
);
