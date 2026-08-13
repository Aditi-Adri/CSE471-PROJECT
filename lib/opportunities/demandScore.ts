import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/geo";
import { DHAKA_AREA_COORDS } from "@/lib/constants/dhakaAreaCoords";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import type { DhakaArea } from "@/app/generated/prisma/client";

/**
 * Neighborhood demand heatmap (Adri, Module 2 Feature 2 — see
 * docs/FEATURE_SPEC.md). Powers /dashboard/opportunities: "which areas
 * need workers most right now."
 *
 * Every input here is a real row already written by some other part of
 * the app — nothing is fabricated for the demo:
 *
 *   - JobRequest (status OPEN): a search matched no category and the
 *     customer posted what they need — the most direct "nobody's here
 *     for this" signal there is, and it's already area-tagged.
 *   - Booking: a real booking request, wherever it ended up — mapped to
 *     its nearest neighborhood centroid via destinationLat/Lng (no
 *     stored area column on Booking itself).
 *   - SosRequest: urgent, geographically precise demand.
 *   - SearchLog (resultCount 0, area set): a customer filtered to a
 *     specific area and found nobody — a softer, automatic version of
 *     JobRequest that doesn't require the customer to post anything.
 *   - Worker (isAvailableNow): the supply side.
 *
 * Score = weighted demand ÷ (available workers + 1). Dividing by
 * supply (not just ranking raw demand) is the whole point — an area
 * with 10 requests and 20 workers isn't "hot," one with 3 requests and
 * 0 workers is. The +1 avoids a division by zero for an area with no
 * workers at all, which is exactly the case we most want to surface.
 */

// How much each signal counts toward "demand." JobRequest is weighted
// highest because it's an explicit, unambiguous request a human typed;
// SosRequest next because it's urgent even though transient; Booking
// and the failed-search signal are the softest (routine and
// automatic, respectively).
const WEIGHTS = {
  openJobRequests: 3,
  recentSosRequests: 2,
  recentBookings: 1,
  recentFailedSearches: 1,
} as const;

const RECENT_DAYS = 30;

export type OpportunityArea = {
  area: DhakaArea;
  label: string;
  lat: number;
  lng: number;
  openJobRequests: number;
  recentBookings: number;
  recentSosRequests: number;
  recentFailedSearches: number;
  availableWorkers: number;
  score: number;
};

/** Snaps a real lat/lng to the closest of the 22 neighborhood centroids. */
function nearestArea(lat: number, lng: number): DhakaArea {
  let best: DhakaArea = "GULSHAN";
  let bestDist = Infinity;
  for (const [area, coord] of Object.entries(DHAKA_AREA_COORDS) as [DhakaArea, { lat: number; lng: number }][]) {
    const d = distanceKm(lat, lng, coord.lat, coord.lng);
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best;
}

function bucketByNearestArea(points: { lat: number; lng: number }[]): Map<DhakaArea, number> {
  const counts = new Map<DhakaArea, number>();
  for (const p of points) {
    const area = nearestArea(p.lat, p.lng);
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return counts;
}

export async function getOpportunityAreas(): Promise<OpportunityArea[]> {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const [openJobRequests, recentBookings, recentSosRequests, availableWorkers, recentFailedSearches] =
    await Promise.all([
      prisma.jobRequest.groupBy({
        by: ["area"],
        where: { status: "OPEN" },
        _count: { _all: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: since } },
        select: { destinationLat: true, destinationLng: true },
      }),
      prisma.sosRequest.findMany({
        where: { createdAt: { gte: since } },
        select: { lat: true, lng: true },
      }),
      prisma.worker.groupBy({
        by: ["area"],
        where: { isAvailableNow: true },
        _count: { _all: true },
      }),
      prisma.searchLog.groupBy({
        by: ["area"],
        where: { createdAt: { gte: since }, resultCount: 0, area: { not: null } },
        _count: { _all: true },
      }),
    ]);

  const bookingsByArea = bucketByNearestArea(
    recentBookings.map((b) => ({ lat: b.destinationLat, lng: b.destinationLng }))
  );
  const sosByArea = bucketByNearestArea(recentSosRequests.map((s) => ({ lat: s.lat, lng: s.lng })));

  const jobRequestsByArea = new Map(openJobRequests.map((r) => [r.area, r._count._all]));
  const workersByArea = new Map(availableWorkers.map((r) => [r.area, r._count._all]));
  const failedSearchesByArea = new Map(
    recentFailedSearches.filter((r) => r.area !== null).map((r) => [r.area as DhakaArea, r._count._all])
  );

  const areas = Object.keys(DHAKA_AREA_COORDS) as DhakaArea[];

  const results: OpportunityArea[] = areas.map((area) => {
    const openJobRequestCount = jobRequestsByArea.get(area) ?? 0;
    const bookingCount = bookingsByArea.get(area) ?? 0;
    const sosCount = sosByArea.get(area) ?? 0;
    const failedSearchCount = failedSearchesByArea.get(area) ?? 0;
    const workerCount = workersByArea.get(area) ?? 0;

    const demand =
      openJobRequestCount * WEIGHTS.openJobRequests +
      sosCount * WEIGHTS.recentSosRequests +
      bookingCount * WEIGHTS.recentBookings +
      failedSearchCount * WEIGHTS.recentFailedSearches;

    return {
      area,
      label: AREA_LABEL_BY_VALUE.get(area) ?? area,
      lat: DHAKA_AREA_COORDS[area].lat,
      lng: DHAKA_AREA_COORDS[area].lng,
      openJobRequests: openJobRequestCount,
      recentBookings: bookingCount,
      recentSosRequests: sosCount,
      recentFailedSearches: failedSearchCount,
      availableWorkers: workerCount,
      score: demand / (workerCount + 1),
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
