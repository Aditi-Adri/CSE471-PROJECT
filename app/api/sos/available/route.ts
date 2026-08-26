import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const STALE_LOCATION_MS = 10 * 60 * 1000;

/**
 * GET /api/sos/available
 *
 * Returns the count of workers currently online, verified, and with a
 * fresh GPS fix — i.e. the pool that *could* be matched if an SOS were
 * triggered right now. Shown on the SOS idle screen so the customer
 * knows whether anyone is around before pressing the button.
 */
export const GET = withErrorHandling(async () => {
  const workers = await prisma.worker.findMany({
    where: {
      isOnline: true,
      isAvailableNow: true,
      verificationTier: { not: "UNVERIFIED" },
      currentLat: { not: null },
      currentLng: { not: null },
      locationUpdatedAt: { gte: new Date(Date.now() - STALE_LOCATION_MS) },
    },
    select: { id: true },
  });

  return Response.json({ availableCount: workers.length });
});
