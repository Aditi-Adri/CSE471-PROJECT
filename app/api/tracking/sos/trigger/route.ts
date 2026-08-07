import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withinRadius, relativeKm } from "@/lib/geo";
import { getIO } from "@/lib/socketServer";

const SOS_RADIUS_KM = 3;

/**
 * POST /api/tracking/sos/trigger
 * body: { customerId: string, customerPhone?: string, lat: number, lng: number }
 *
 * Creates an SOS request, geo-matches it against online/verified/available
 * technicians within SOS_RADIUS_KM, and pages each of them over their
 * personal socket room.
 */
export async function POST(request: NextRequest) {
  try {
    const { customerId, customerPhone, lat, lng } = await request.json();
    if (!customerId || lat == null || lng == null) {
      return NextResponse.json({ error: "customerId, lat, lng are required" }, { status: 400 });
    }

    // Pull candidate workers who are online, verified, and available
    const candidates = await prisma.workerLocation.findMany({
      where: { isOnline: true, isVerified: true, isAvailable: true },
    });

    const nearbyWorkers = withinRadius({ lat, lng }, candidates || [], SOS_RADIUS_KM);

    const sos = await prisma.sosRequest.create({
      data: {
        customerId,
        customerPhone: customerPhone || null,
        lat,
        lng,
        radiusKm: SOS_RADIUS_KM,
        alertedWorkerIds: nearbyWorkers.map((w) => w.workerId),
      },
    });

    // Safely broadcast via socket if the socket server exists
    try {
      const io = getIO();
      if (io) {
        nearbyWorkers.forEach((worker) => {
          io.to(`worker:${worker.workerId}`).emit("sos:new", {
            sosId: sos.id,
            lat,
            lng,
            createdAt: sos.createdAt,
          });
        });
      }
    } catch (socketErr) {
      console.warn("Socket broadcast warning:", socketErr);
    }

    return NextResponse.json(
      {
        sosId: sos.id,
        radiusKm: SOS_RADIUS_KM,
        alertedWorkerCount: nearbyWorkers.length,
        customerLocation: { lat, lng },
        nearbyWorkers: nearbyWorkers.map((w) => ({
          workerId: w.workerId,
          name: w.name,
          ...relativeKm({ lat, lng }, w),
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in /api/tracking/sos/trigger:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to trigger SOS" },
      { status: 500 }
    );
  }
}