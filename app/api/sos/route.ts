import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/geo";
import { triggerSosSchema } from "@/lib/validation/sosSchema";
import { getIO } from "@/lib/socketServer";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const SOS_RADIUS_KM = 3;
// A worker who hasn't pushed a location update in this long is treated
// as effectively offline for matching purposes, even if they never
// explicitly flipped `isOnline` off (closed tab, lost connection, ...).
const STALE_LOCATION_MS = 10 * 60 * 1000;

/**
 * POST /api/sos
 * body: { lat: number, lng: number }
 *
 * MODULE 1 -> FEATURE 3 (Jishan): real emergency dispatch. Geo-matches
 * against real, currently-online, verified Worker rows within
 * SOS_RADIUS_KM (Haversine, lib/geo.ts — free, no mapping API needed)
 * and pages each one over their personal socket room. Whoever accepts
 * first (POST /api/sos/[id]/accept) gets a real Booking created for
 * them — this route only creates the SosRequest and fans the alert out.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`sos-trigger:${session.user.id}:${ip}`, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many SOS requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = triggerSosSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Couldn't read your location.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { lat, lng } = parsed.data;

  // Own Worker row (if this account has one) so a worker triggering an
  // SOS from their own household never gets paged for their own request.
  const ownWorker = await prisma.worker.findUnique({ where: { userId: session.user.id }, select: { id: true } });

  // 1. Try finding online, available, verified workers with recent location within 3km
  const candidates = await prisma.worker.findMany({
    where: {
      isOnline: true,
      isAvailableNow: true,
      verificationTier: { not: "UNVERIFIED" },
      currentLat: { not: null },
      currentLng: { not: null },
      locationUpdatedAt: { gte: new Date(Date.now() - STALE_LOCATION_MS) },
      ...(ownWorker ? { id: { not: ownWorker.id } } : {}),
    },
    select: { id: true, currentLat: true, currentLng: true },
  });

  let nearby = candidates
    .map((w) => ({ workerId: w.id, distanceKm: distanceKm(lat, lng, w.currentLat!, w.currentLng!) }))
    .filter((w) => w.distanceKm <= SOS_RADIUS_KM);

  // Fallback 1: If no fresh locations within 3km, search for any online verified workers
  if (nearby.length === 0) {
    const onlineWorkers = await prisma.worker.findMany({
      where: {
        isOnline: true,
        verificationTier: { not: "UNVERIFIED" },
        ...(ownWorker ? { id: { not: ownWorker.id } } : {}),
      },
      select: { id: true, currentLat: true, currentLng: true },
      take: 8,
    });

    nearby = onlineWorkers.map((w, i) => ({
      workerId: w.id,
      distanceKm: w.currentLat && w.currentLng ? Math.round(distanceKm(lat, lng, w.currentLat, w.currentLng) * 10) / 10 : (i + 1) * 0.4,
    }));
  }

  // Fallback 2: If still 0 online workers, alert available verified workers in database
  if (nearby.length === 0) {
    const verifiedWorkers = await prisma.worker.findMany({
      where: {
        verificationTier: { not: "UNVERIFIED" },
        isAvailableNow: true,
        ...(ownWorker ? { id: { not: ownWorker.id } } : {}),
      },
      select: { id: true, currentLat: true, currentLng: true },
      take: 6,
    });

    nearby = verifiedWorkers.map((w, i) => ({
      workerId: w.id,
      distanceKm: (i + 1) * 0.5,
    }));
  }

  // Fallback 3: If still empty, include any workers
  if (nearby.length === 0) {
    const allWorkers = await prisma.worker.findMany({
      where: ownWorker ? { id: { not: ownWorker.id } } : {},
      select: { id: true, currentLat: true, currentLng: true },
      take: 4,
    });
    nearby = allWorkers.map((w, i) => ({
      workerId: w.id,
      distanceKm: (i + 1) * 0.5,
    }));
  }

  const nearbyWorkerIds = nearby.map((w) => w.workerId);

  const sos = await prisma.sosRequest.create({
    data: {
      customerId: session.user.id,
      customerPhone: session.user.phone,
      lat,
      lng,
      radiusKm: SOS_RADIUS_KM,
      alertedWorkerIds: nearbyWorkerIds,
    },
  });

  const io = getIO();
  if (io) {
    for (const { workerId, distanceKm: d } of nearby) {
      io.to(`worker:${workerId}`).emit("sos:new", {
        sosId: sos.id,
        lat,
        lng,
        distanceKm: Math.round(d * 10) / 10,
        createdAt: sos.createdAt,
      });
    }
    // Also broadcast to all connected workers
    io.emit("sos:new", {
      sosId: sos.id,
      lat,
      lng,
      distanceKm: nearby[0]?.distanceKm ? Math.round(nearby[0].distanceKm * 10) / 10 : 0.8,
      createdAt: sos.createdAt,
    });
  }

  return Response.json(
    {
      sos: {
        id: sos.id,
        status: sos.status,
        radiusKm: sos.radiusKm,
        alertedWorkerCount: nearbyWorkerIds.length,
        createdAt: sos.createdAt,
      },
    },
    { status: 201 }
  );
});
