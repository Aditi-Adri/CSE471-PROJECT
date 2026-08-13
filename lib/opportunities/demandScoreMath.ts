import { distanceKm } from "@/lib/geo";
import { DHAKA_AREA_COORDS } from "@/lib/constants/dhakaAreaCoords";
import type { DhakaArea } from "@/app/generated/prisma/client";

/**
 * The pure half of the neighborhood demand heatmap's scoring logic —
 * no `@/lib/db` import on purpose, same reason lib/search/
 * buildWorkerQuery.ts keeps query-building separate from the Prisma
 * client: it's what makes demandScore.test.ts runnable with no
 * database/env setup at all. See demandScore.ts for the part that
 * actually queries the database and calls these functions.
 */

// How much each signal counts toward "demand." JobRequest is weighted
// highest because it's an explicit, unambiguous request a human typed;
// SosRequest next because it's urgent even though transient; Booking
// and the failed-search signal are the softest (routine and
// automatic, respectively).
export const WEIGHTS = {
  openJobRequests: 3,
  recentSosRequests: 2,
  recentBookings: 1,
  recentFailedSearches: 1,
} as const;

export const RECENT_DAYS = 30;

/** Snaps a real lat/lng to the closest of the 22 neighborhood centroids. */
export function nearestArea(lat: number, lng: number): DhakaArea {
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

export function bucketByNearestArea(points: { lat: number; lng: number }[]): Map<DhakaArea, number> {
  const counts = new Map<DhakaArea, number>();
  for (const p of points) {
    const area = nearestArea(p.lat, p.lng);
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return counts;
}

/**
 * Score = weighted demand ÷ (available workers + 1). Dividing by
 * supply (not just ranking raw demand) is the whole point — an area
 * with 10 requests and 20 workers isn't "hot," one with 3 requests and
 * 0 workers is. The +1 avoids a division by zero for an area with no
 * workers at all, which is exactly the case we most want to surface.
 */
export function computeShortageScore(counts: {
  openJobRequests: number;
  recentSosRequests: number;
  recentBookings: number;
  recentFailedSearches: number;
  availableWorkers: number;
}): number {
  const demand =
    counts.openJobRequests * WEIGHTS.openJobRequests +
    counts.recentSosRequests * WEIGHTS.recentSosRequests +
    counts.recentBookings * WEIGHTS.recentBookings +
    counts.recentFailedSearches * WEIGHTS.recentFailedSearches;
  return demand / (counts.availableWorkers + 1);
}
