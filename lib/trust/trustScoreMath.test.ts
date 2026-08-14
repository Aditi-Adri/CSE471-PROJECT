import { describe, expect, it } from "vitest";
import { computeTrustScore, TRUST_WEIGHTS } from "./trustScoreMath";

const BASE = {
  ratingAvg: 0,
  authenticReviewCount: 0,
  fraudFlaggedCount: 0,
  totalNonHiddenReviewCount: 0,
  completedCount: 0,
  postAcceptanceCount: 0,
  verificationTier: "UNVERIFIED" as const,
  avgResponseMinutes: null,
};

describe("TRUST_WEIGHTS", () => {
  it("sums to 1", () => {
    const sum = Object.values(TRUST_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 9);
  });
});

describe("computeTrustScore", () => {
  it("gives a brand new worker a modest, non-zero starting score", () => {
    const result = computeTrustScore(BASE);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(70);
  });

  it("never exceeds 100 even with perfect everything", () => {
    const result = computeTrustScore({
      ratingAvg: 5,
      authenticReviewCount: 50,
      fraudFlaggedCount: 0,
      totalNonHiddenReviewCount: 50,
      completedCount: 100,
      postAcceptanceCount: 100,
      verificationTier: "TIER3_POLICE_CLEARED",
      avgResponseMinutes: 0,
    });
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.total).toBeGreaterThan(95);
  });

  it("never goes below 0, and a worker with every negative signal scores far below a clean new worker", () => {
    // The worst achievable score isn't 0: an UNVERIFIED tier and a
    // "no data yet" metric both resolve to a baseline rather than 0 by
    // design (see NO_DATA_BASELINE) — a new worker who hasn't proven
    // anything yet shouldn't score the same as one proven bad. This
    // checks the actual floor stays low and non-negative, not that it
    // hits exactly 0.
    const worstCase = computeTrustScore({
      ratingAvg: 1,
      // Every review this worker has ever gotten was flagged as fraud
      // — none count as "authentic", so rating/volume fall back to
      // their no-data behavior while authenticity bottoms out.
      authenticReviewCount: 0,
      fraudFlaggedCount: 20,
      totalNonHiddenReviewCount: 20,
      completedCount: 0,
      postAcceptanceCount: 100,
      verificationTier: "UNVERIFIED",
      avgResponseMinutes: 100_000,
    });
    expect(worstCase.total).toBeGreaterThanOrEqual(0);
    expect(worstCase.reviewAuthenticity).toBe(0);
    expect(worstCase.completionReliability).toBe(0);

    const newWorker = computeTrustScore(BASE);
    expect(worstCase.total).toBeLessThan(newWorker.total);
  });

  it("a higher average rating scores higher, all else equal", () => {
    const low = computeTrustScore({ ...BASE, ratingAvg: 2, authenticReviewCount: 10, totalNonHiddenReviewCount: 10 });
    const high = computeTrustScore({ ...BASE, ratingAvg: 4.8, authenticReviewCount: 10, totalNonHiddenReviewCount: 10 });
    expect(high.total).toBeGreaterThan(low.total);
  });

  it("a higher verification tier scores higher, all else equal", () => {
    const unverified = computeTrustScore({ ...BASE, verificationTier: "UNVERIFIED" });
    const tier3 = computeTrustScore({ ...BASE, verificationTier: "TIER3_POLICE_CLEARED" });
    expect(tier3.total).toBeGreaterThan(unverified.total);
  });

  it("faster average response time scores higher, all else equal", () => {
    const slow = computeTrustScore({ ...BASE, avgResponseMinutes: 600 });
    const fast = computeTrustScore({ ...BASE, avgResponseMinutes: 2 });
    expect(fast.responsiveness).toBeGreaterThan(slow.responsiveness);
    expect(fast.total).toBeGreaterThan(slow.total);
  });

  it("more fraud-flagged reviews (of the same total) lowers authenticity and the total", () => {
    const clean = computeTrustScore({ ...BASE, fraudFlaggedCount: 0, totalNonHiddenReviewCount: 10 });
    const flagged = computeTrustScore({ ...BASE, fraudFlaggedCount: 5, totalNonHiddenReviewCount: 10 });
    expect(flagged.reviewAuthenticity).toBeLessThan(clean.reviewAuthenticity);
    expect(flagged.total).toBeLessThan(clean.total);
  });

  it("a 5.0 average from many reviews outscores the same average from one review — volume matters", () => {
    const oneReview = computeTrustScore({
      ...BASE,
      ratingAvg: 5,
      authenticReviewCount: 1,
      totalNonHiddenReviewCount: 1,
    });
    const manyReviews = computeTrustScore({
      ...BASE,
      ratingAvg: 5,
      authenticReviewCount: 15,
      totalNonHiddenReviewCount: 15,
    });
    expect(manyReviews.total).toBeGreaterThan(oneReview.total);
  });

  it("a worker who completes every accepted job scores higher reliability than one who bails half the time", () => {
    const reliable = computeTrustScore({ ...BASE, completedCount: 10, postAcceptanceCount: 10 });
    const flaky = computeTrustScore({ ...BASE, completedCount: 5, postAcceptanceCount: 10 });
    expect(reliable.completionReliability).toBeGreaterThan(flaky.completionReliability);
    expect(reliable.total).toBeGreaterThan(flaky.total);
  });

  it("missing-data metrics (no reviews, no responses, no accepted jobs) don't crash and land at the neutral baseline", () => {
    const result = computeTrustScore(BASE);
    expect(result.ratingQuality).toBe(60);
    expect(result.completionReliability).toBe(60);
    expect(result.responsiveness).toBe(60);
    expect(result.reviewAuthenticity).toBe(100);
    expect(result.reviewVolume).toBe(0);
  });
});
