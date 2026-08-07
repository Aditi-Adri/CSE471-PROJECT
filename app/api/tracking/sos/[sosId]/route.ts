import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { relativeKm } from "@/lib/geo";

// Force Next.js to dynamically fetch fresh data on every request
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/tracking/sos/[sosId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sosId: string }> }
) {
  const { sosId } = await params;

  try {
    const sos = await prisma.sosRequest.findUnique({ where: { id: sosId } });
    if (!sos) {
      return NextResponse.json({ error: "SOS request not found" }, { status: 404 });
    }

    // Only fetch worker locations that actually exist in the DB
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

    return NextResponse.json({
      sosId: sos.id,
      status: sos.status,
      radiusKm: sos.radiusKm,
      customerLocation: { lat: sos.lat, lng: sos.lng },
      // 🟢 Count matches the exact number of active workers found
      alertedWorkerCount: alertedWorkers.length,
      nearbyWorkers: alertedWorkers.map((w) => ({
        workerId: w.workerId,
        name: w.name,
        ...relativeKm({ lat: sos.lat, lng: sos.lng }, w),
      })),
      accepted,
      createdAt: sos.createdAt,
    });
  } catch (error) {
    console.error("Error fetching SOS request:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}