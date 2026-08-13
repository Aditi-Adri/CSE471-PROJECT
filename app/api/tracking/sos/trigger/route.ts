import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withinRadius, relativeKm } from "@/lib/geo";
import { getIO } from "@/lib/socketServer";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const SOS_RADIUS_KM = 3;

/**
 * POST /api/tracking/sos/trigger
 * body: { customerPhone?: string, lat: number, lng: number }
 *
 * Creates an SOS request, geo-matches it against online/verified/available
 * technicians within SOS_RADIUS_KM, and pages each of them over their
 * personal socket room.
 *
 * `customerId` used to come straight from the request body — anyone
 * could page every nearby worker while impersonating an arbitrary
 * customer, with no rate limit. It now comes from the signed-in
 * session instead, and triggers are throttled per user.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`sos-trigger:${session.user.id}:${ip}`, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many SOS requests. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const lat = body?.lat;
  const lng = body?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return Response.json({ error: "lat, lng are required" }, { status: 400 });
  }
  const customerPhone: string | null =
    typeof body?.customerPhone === "string" ? body.customerPhone : (session.user.phone ?? null);

  // Pull candidate workers who are online, verified, and available
  const candidates = await prisma.workerLocation.findMany({
    where: { isOnline: true, isVerified: true, isAvailable: true },
  });

  const nearbyWorkers = withinRadius({ lat, lng }, candidates || [], SOS_RADIUS_KM);

  const sos = await prisma.sosRequest.create({
    data: {
      customerId: session.user.id,
      customerPhone,
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

  return Response.json(
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
});
