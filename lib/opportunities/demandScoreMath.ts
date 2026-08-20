import { distanceKm } from "@/lib/geo";
import { DHAKA_AREA_COORDS } from "@/lib/constants/dhakaAreaCoords";
import type { DhakaArea } from "@/app/generated/prisma/client";

// The math for the demand heatmap score. Kept separate from
// demandScore.ts so it can be unit-tested with no database needed.

// How much each signal counts toward "demand". A direct job request
// counts the most, an SOS call next, bookings and failed searches least.
export const WEIGHTS = {
  openJobRequests: 3,
  recentSosRequests: 2,
  recentBookings: 1,
  recentFailedSearches: 1,
} as const;

export const RECENT_DAYS = 30;

// Finds which of the 22 Dhaka neighborhoods a lat/lng point is closest to.
export function nearestArea(lat: number, lng: number): DhakaArea {
  let closestArea: DhakaArea = "GULSHAN";
  let closestDistance = Infinity;

  for (const area in DHAKA_AREA_COORDS) {
    const areaKey = area as DhakaArea;
    const coord = DHAKA_AREA_COORDS[areaKey];
    const distance = distanceKm(lat, lng, coord.lat, coord.lng);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestArea = areaKey;
    }
  }

  return closestArea;
}

// Counts how many points fall nearest to each area.
export function bucketByNearestArea(points: { lat: number; lng: number }[]): Map<DhakaArea, number> {
  const counts = new Map<DhakaArea, number>();
  for (const point of points) {
    const area = nearestArea(point.lat, point.lng);
    const currentCount = counts.get(area) ?? 0;
    counts.set(area, currentCount + 1);
  }
  return counts;
}

// Removes fake/test GPS points. A real address almost never shares the
// exact same lat/lng (to 5 decimals) as many other points — if a point
// repeats too often, it's a test/default location, not real demand.
export function filterPlausibleLocations(
  points: { lat: number; lng: number }[],
  maxExactDuplicates = 3
): { lat: number; lng: number }[] {
  const counts = new Map<string, number>();
  for (const point of points) {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    const currentCount = counts.get(key) ?? 0;
    counts.set(key, currentCount + 1);
  }

  const plausiblePoints = [];
  for (const point of points) {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    const count = counts.get(key) ?? 0;
    if (count <= maxExactDuplicates) {
      plausiblePoints.push(point);
    }
  }
  return plausiblePoints;
}

// Score = weighted demand divided by (available workers + 1).
// Dividing by supply matters: an area with 10 requests and 20 workers
// isn't a shortage, but 3 requests and 0 workers is. The +1 just
// avoids dividing by zero when an area has no workers at all.
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
