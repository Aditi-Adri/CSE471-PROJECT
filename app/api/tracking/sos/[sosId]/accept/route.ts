// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/db";
// import { relativeKm } from "@/lib/geo";

// /**
//  * GET /api/tracking/sos/[sosId]
//  *
//  * Returns the SOS request's current state, shaped to match the
//  * "sos:accepted" socket payload emitted by the accept route.
//  */
// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ sosId: string }> }
// ) {
//   const { sosId } = await params;

//   try {
//     const sos = await prisma.sosRequest.findUnique({ where: { id: sosId } });
//     if (!sos) {
//       return NextResponse.json({ error: "SOS request not found" }, { status: 404 });
//     }

//     // Workers who were alerted, plotted on the radar relative to the customer.
//     const alertedWorkers = sos.alertedWorkerIds?.length
//       ? await prisma.workerLocation.findMany({
//           where: { workerId: { in: sos.alertedWorkerIds } },
//         })
//       : [];

//     let accepted = null;
//     if (sos.status === "ACCEPTED" && sos.acceptedWorkerId) {
//       const worker = await prisma.workerLocation.findUnique({
//         where: { workerId: sos.acceptedWorkerId },
//       });
      
//       accepted = {
//         sosId: sos.id,
//         workerId: sos.acceptedWorkerId,
//         etaMinutes: sos.etaMinutes, // Updated field name here
//         worker: worker
//           ? {
//               name: worker.name,
//               role: worker.role,
//               rating: worker.rating,
//               avatarInitials: worker.avatarInitials || worker.name.slice(0, 2).toUpperCase(),
//             }
//           : null,
//         workerLocation: worker ? { lat: worker.lat, lng: worker.lng } : null,
//       };
//     }

//     return NextResponse.json({
//       sosId: sos.id,
//       status: sos.status,
//       radiusKm: sos.radiusKm,
//       customerLocation: { lat: sos.lat, lng: sos.lng },
//       alertedWorkerCount: sos.alertedWorkerIds?.length || 0,
//       nearbyWorkers: alertedWorkers.map((w) => ({
//         workerId: w.workerId,
//         name: w.name,
//         ...relativeKm({ lat: sos.lat, lng: sos.lng }, w),
//       })),
//       accepted,
//       createdAt: sos.createdAt,
//     });
//   } catch (error) {
//     console.error("Error fetching SOS request:", error);
//     return NextResponse.json(
//       { error: (error as Error).message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/tracking/sos/[sosId]/accept
 *
 * Marks an SOS request as ACCEPTED by a given worker in Prisma
 * and returns the payload expected by the client and WebSockets listener.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sosId: string }> }
) {
  const { sosId } = await params;

  try {
    const body = await request.json();
    const { workerId, etaMinutes = 5 } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: "workerId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch the SOS request
    const existingSos = await prisma.sosRequest.findUnique({
      where: { id: sosId },
    });

    if (!existingSos) {
      return NextResponse.json(
        { error: "SOS request not found" },
        { status: 404 }
      );
    }

    // Guard against race conditions if another worker accepted first
    if (existingSos.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "SOS request has already been accepted by another worker" },
        { status: 409 }
      );
    }

    // 2. Fetch worker info from Prisma
    const worker = await prisma.workerLocation.findUnique({
      where: { workerId },
    });

    // 3. Update the SOS status in Prisma
    const updatedSos = await prisma.sosRequest.update({
      where: { id: sosId },
      data: {
        status: "ACCEPTED",
        acceptedWorkerId: workerId,
        etaMinutes: etaMinutes,
      },
    });

    // 4. Construct payload (matches the "accepted" format in your GET route)
    const acceptedPayload = {
      sosId: updatedSos.id,
      workerId: updatedSos.acceptedWorkerId,
      etaMinutes: updatedSos.etaMinutes,
      worker: worker
        ? {
            name: worker.name,
            role: worker.role,
            rating: worker.rating,
            avatarInitials:
              worker.avatarInitials || worker.name.slice(0, 2).toUpperCase(),
          }
        : {
            name: "Verified Worker",
            role: "Technician",
            rating: 5.0,
            avatarInitials: "VW",
          },
      workerLocation: worker ? { lat: worker.lat, lng: worker.lng } : null,
    };

    return NextResponse.json(acceptedPayload, { status: 200 });
  } catch (error) {
    console.error("Error accepting SOS request:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to accept SOS" },
      { status: 500 }
    );
  }
}