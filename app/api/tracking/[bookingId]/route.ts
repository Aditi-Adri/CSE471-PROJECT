import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/tracking/[bookingId]
 *
 * Returns the current booking status, ETA, and (if assigned) the
 * technician's last known location, for the /track/[bookingId] page's
 * initial load / refresh.
 *
 * Looks up WorkerLocation first (for live GPS tracking data), then
 * falls back to the main Worker table for real bookings that don't
 * have a WorkerLocation entry yet.
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
      // Try WorkerLocation first (has live GPS data)
      const workerLocation = await prisma.workerLocation.findUnique({
        where: { workerId: booking.workerId },
      });

      if (workerLocation) {
        worker = {
          id: workerLocation.workerId,
          name: workerLocation.name,
          role: workerLocation.role,
          rating: workerLocation.rating,
          avatarInitials: workerLocation.avatarInitials,
          lat: workerLocation.lat,
          lng: workerLocation.lng,
        };
      } else {
        // Fall back to main Worker table for real bookings
        const realWorker = await prisma.worker.findUnique({
          where: { id: booking.workerId },
          include: { user: { select: { name: true } } },
        });

        if (realWorker) {
          const initials = realWorker.user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          worker = {
            id: realWorker.id,
            name: realWorker.user.name,
            role: realWorker.headline || "Technician",
            rating: realWorker.ratingAvg,
            avatarInitials: initials,
            lat: 23.79, // Default starting location (Dhaka)
            lng: 90.415,
          };

          // Auto-create a WorkerLocation entry so live tracking can start
          await prisma.workerLocation
            .create({
              data: {
                workerId: realWorker.id,
                name: realWorker.user.name,
                role: realWorker.headline || "Technician",
                rating: realWorker.ratingAvg,
                avatarInitials: initials,
                lat: 23.79,
                lng: 90.415,
                isOnline: true,
                isVerified: realWorker.verificationTier !== "UNVERIFIED",
                isAvailable: realWorker.isAvailableNow,
              },
            })
            .catch(() => {
              // Ignore if already exists (race condition)
            });
        }
      }
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
      customerId: booking.customerId,
      customerPhone: booking.customerPhone,
      worker,
    });
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}