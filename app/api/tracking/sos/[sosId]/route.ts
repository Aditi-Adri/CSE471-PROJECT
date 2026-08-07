import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { relativeKm } from "@/lib/geo";

/**
 * GET /api/tracking/sos/[sosId]
 *
 * Returns the SOS request's current state, shaped to match the
 * "sos:accepted" socket payload emitted by the accept route.
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
        etaMinutes: sos.etaMinutes, // Updated field name here
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
      alertedWorkerCount: sos.alertedWorkerIds?.length || 0,
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