import { prisma } from "@/lib/db";
import { DHAKA_AREA_COORDS } from "@/lib/constants/dhakaAreaCoords";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { bucketByNearestArea, computeShortageScore, filterPlausibleLocations, RECENT_DAYS } from "./demandScoreMath";
import type { DhakaArea } from "@/app/generated/prisma/client";

// Neighborhood demand heatmap: works out which Dhaka areas need
// workers most right now, using real rows already in the database:
//   - JobRequest (OPEN): a customer posted what they need directly.
//   - Booking: mapped to the nearest area using its lat/lng.
//   - SosRequest: urgent demand, also mapped by lat/lng.
//   - SearchLog (0 results, area set): a search that found nobody.
//   - Worker (isAvailableNow): the supply side.
// The scoring formula itself lives in demandScoreMath.ts.

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

  // Build the list of booking/SOS points, then bucket each list by
  // whichever area it's closest to.
  const bookingPoints = [];
  for (const booking of recentBookings) {
    bookingPoints.push({ lat: booking.destinationLat, lng: booking.destinationLng });
  }
  const sosPoints = [];
  for (const sos of recentSosRequests) {
    sosPoints.push({ lat: sos.lat, lng: sos.lng });
  }
  const bookingsByArea = bucketByNearestArea(filterPlausibleLocations(bookingPoints));
  const sosByArea = bucketByNearestArea(filterPlausibleLocations(sosPoints));

  // Turn each Prisma groupBy result into a simple "area -> count" map.
  const jobRequestsByArea = new Map<DhakaArea, number>();
  for (const row of openJobRequests) {
    jobRequestsByArea.set(row.area, row._count._all);
  }
  const workersByArea = new Map<DhakaArea, number>();
  for (const row of availableWorkers) {
    workersByArea.set(row.area, row._count._all);
  }
  const failedSearchesByArea = new Map<DhakaArea, number>();
  for (const row of recentFailedSearches) {
    if (row.area !== null) {
      failedSearchesByArea.set(row.area, row._count._all);
    }
  }

  // Build one result row per Dhaka area, with its score.
  const areas = Object.keys(DHAKA_AREA_COORDS) as DhakaArea[];
  const results: OpportunityArea[] = [];

  for (const area of areas) {
    const openJobRequestCount = jobRequestsByArea.get(area) ?? 0;
    const bookingCount = bookingsByArea.get(area) ?? 0;
    const sosCount = sosByArea.get(area) ?? 0;
    const failedSearchCount = failedSearchesByArea.get(area) ?? 0;
    const workerCount = workersByArea.get(area) ?? 0;

    const score = computeShortageScore({
      openJobRequests: openJobRequestCount,
      recentSosRequests: sosCount,
      recentBookings: bookingCount,
      recentFailedSearches: failedSearchCount,
      availableWorkers: workerCount,
    });

    results.push({
      area,
      label: AREA_LABEL_BY_VALUE.get(area) ?? area,
      lat: DHAKA_AREA_COORDS[area].lat,
      lng: DHAKA_AREA_COORDS[area].lng,
      openJobRequests: openJobRequestCount,
      recentBookings: bookingCount,
      recentSosRequests: sosCount,
      recentFailedSearches: failedSearchCount,
      availableWorkers: workerCount,
      score,
    });
  }

  // Highest shortage score first.
  results.sort((a, b) => b.score - a.score);
  return results;
}
