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
 * Drops points that share an exact (lat, lng) beyond a small
 * threshold. Real GPS fixes from distinct real addresses essentially
 * never coincide to 5 decimal places (~1m) at any volume — a large
 * exact-duplicate cluster is a hardcoded fallback/test coordinate
 * (e.g. a dev browser's default location when Geolocation permission
 * was never granted during testing), not real demand. Found via a
 * live check against the shared dev DB: one point repeated 45+ times
 * in Booking and 25+ times in SosRequest. Filtering by "suspiciously
 * exact duplicate" rather than hardcoding that one coordinate keeps
 * this general enough to catch any future artifact of the same shape.
 */
export function filterPlausibleLocations<T extends { lat: number; lng: number }>(
  points: T[],
  maxExactDuplicates = 3
): T[] {
  const key = (p: T) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  const counts = new Map<string, number>();
  for (const p of points) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1);
  return points.filter((p) => (counts.get(key(p)) ?? 0) <= maxExactDuplicates);
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
