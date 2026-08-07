import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/tracking/[bookingId]
 *
 * Returns the current booking status, ETA, and (if assigned) the
 * technician's last known location, for the /track/[bookingId] page's
 * initial load / refresh.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let worker = null;
    if (booking.workerId) {
      worker = await prisma.workerLocation.findUnique({
        where: { workerId: booking.workerId },
      });
    }

    return NextResponse.json({
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
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}