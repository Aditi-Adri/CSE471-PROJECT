import { describe, expect, it } from "vitest";
import { computeReviewEligibility, REVIEW_WINDOW_MS } from "./reviewEligibilityMath";

const NOW = new Date("2026-08-14T12:00:00Z");

describe("computeReviewEligibility", () => {
  it("is ineligible when the booking was never completed", () => {
    const result = computeReviewEligibility({ status: "CONFIRMED", completedAt: null }, false, NOW);
    expect(result.eligible).toBe(false);
    expect(result).toMatchObject({ reason: "not_completed" });
  });

  it("is eligible right after completion, within the window", () => {
    const completedAt = new Date(NOW.getTime() - 60 * 60 * 1000); // 1h ago
    const result = computeReviewEligibility({ status: "COMPLETED", completedAt }, false, NOW);
    expect(result.eligible).toBe(true);
  });

  it("is ineligible once the review already exists", () => {
    const completedAt = new Date(NOW.getTime() - 60 * 60 * 1000);
    const result = computeReviewEligibility({ status: "COMPLETED", completedAt }, true, NOW);
    expect(result.eligible).toBe(false);
    expect(result).toMatchObject({ reason: "already_reviewed" });
  });

  it("is eligible right up to the 72h deadline", () => {
    const completedAt = new Date(NOW.getTime() - REVIEW_WINDOW_MS + 1000); // 1s before deadline
    const result = computeReviewEligibility({ status: "COMPLETED", completedAt }, false, NOW);
    expect(result.eligible).toBe(true);
  });

  it("is ineligible just past the 72h deadline", () => {
    const completedAt = new Date(NOW.getTime() - REVIEW_WINDOW_MS - 1000); // 1s after deadline
    const result = computeReviewEligibility({ status: "COMPLETED", completedAt }, false, NOW);
    expect(result.eligible).toBe(false);
    expect(result).toMatchObject({ reason: "window_expired" });
  });
});
