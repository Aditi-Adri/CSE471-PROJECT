import { describe, expect, it } from "vitest";
import { computeShortageScore, nearestArea } from "./demandScoreMath";
import { DHAKA_AREA_COORDS } from "@/lib/constants/dhakaAreaCoords";

describe("computeShortageScore", () => {
  it("returns 0 for an area with no demand signals at all", () => {
    expect(
      computeShortageScore({
        openJobRequests: 0,
        recentSosRequests: 0,
        recentBookings: 0,
        recentFailedSearches: 0,
        availableWorkers: 5,
      })
    ).toBe(0);
  });

  it("weights an open JobRequest higher than a booking or a failed search", () => {
    const fromOneJobRequest = computeShortageScore({
      openJobRequests: 1,
      recentSosRequests: 0,
      recentBookings: 0,
      recentFailedSearches: 0,
      availableWorkers: 0,
    });
    const fromOneBooking = computeShortageScore({
      openJobRequests: 0,
      recentSosRequests: 0,
      recentBookings: 1,
      recentFailedSearches: 0,
      availableWorkers: 0,
    });
    expect(fromOneJobRequest).toBeGreaterThan(fromOneBooking);
  });

  it("never divides by zero — an area with real demand and zero workers is finite, not Infinity", () => {
    const score = computeShortageScore({
      openJobRequests: 4,
      recentSosRequests: 0,
      recentBookings: 0,
      recentFailedSearches: 0,
      availableWorkers: 0,
    });
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it("more available workers lowers the score for identical demand — shortage, not raw demand", () => {
    const counts = { openJobRequests: 5, recentSosRequests: 0, recentBookings: 0, recentFailedSearches: 0 };
    const fewWorkers = computeShortageScore({ ...counts, availableWorkers: 1 });
    const manyWorkers = computeShortageScore({ ...counts, availableWorkers: 20 });
    expect(fewWorkers).toBeGreaterThan(manyWorkers);
  });
});

describe("nearestArea", () => {
  it("maps each area's own centroid back to itself", () => {
    for (const [area, coord] of Object.entries(DHAKA_AREA_COORDS)) {
      expect(nearestArea(coord.lat, coord.lng)).toBe(area);
    }
  });

  it("maps a point closer to one known area than any other to that area", () => {
    const gulshan = DHAKA_AREA_COORDS.GULSHAN;
    // A tiny nudge (~100m) off Gulshan's centroid should still resolve to Gulshan.
    expect(nearestArea(gulshan.lat + 0.001, gulshan.lng + 0.001)).toBe("GULSHAN");
  });
});
