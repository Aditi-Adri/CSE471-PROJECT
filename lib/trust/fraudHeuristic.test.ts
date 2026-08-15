import { describe, expect, it } from "vitest";
import { scoreReviewHeuristically } from "./fraudHeuristic";

describe("scoreReviewHeuristically", () => {
  it("scores a genuine, detailed review low", () => {
    const { score } = scoreReviewHeuristically({
      rating: 5,
      comment: "Fixed the leaking kitchen tap in about 20 minutes, cleaned up after, and was on time. Would book again.",
    });
    expect(score).toBeLessThan(0.3);
  });

  it("flags a comment that's too short to say anything real", () => {
    const { score, reasons } = scoreReviewHeuristically({ rating: 5, comment: "great" });
    expect(score).toBeGreaterThan(0);
    expect(reasons.join(" ")).toMatch(/short/i);
  });

  it("flags an exact generic/templated phrase", () => {
    const { score, reasons } = scoreReviewHeuristically({ rating: 5, comment: "good service" });
    expect(score).toBeGreaterThan(0);
    expect(reasons.join(" ")).toMatch(/generic/i);
  });

  it("flags a high rating paired with a negative-reading comment", () => {
    const { score, reasons } = scoreReviewHeuristically({
      rating: 5,
      comment: "This was a terrible and unprofessional experience, would never book again.",
    });
    expect(score).toBeGreaterThan(0.3);
    expect(reasons.join(" ")).toMatch(/negative/i);
  });

  it("flags a low rating paired with a positive-reading comment", () => {
    const { score, reasons } = scoreReviewHeuristically({
      rating: 1,
      comment: "Amazing, excellent, professional and punctual — fantastic work overall.",
    });
    expect(score).toBeGreaterThan(0.3);
    expect(reasons.join(" ")).toMatch(/positive/i);
  });

  it("flags excessive character repetition", () => {
    const { score, reasons } = scoreReviewHeuristically({
      rating: 5,
      comment: "sooooooo good, best worker everrrrrr in the whole city",
    });
    expect(score).toBeGreaterThan(0);
    expect(reasons.join(" ")).toMatch(/repeated/i);
  });

  it("flags exclamation-mark spam", () => {
    const { score, reasons } = scoreReviewHeuristically({
      rating: 5,
      comment: "Amazing work!!!! Best ever!!!! Book now!!!!",
    });
    expect(score).toBeGreaterThan(0);
    expect(reasons.join(" ")).toMatch(/exclamation/i);
  });

  it("never exceeds a score of 1 even when every signal fires at once", () => {
    const { score } = scoreReviewHeuristically({
      rating: 5,
      comment: "terrible!!!! terrible!!!! terrible!!!! sooooo bad",
    });
    expect(score).toBeLessThanOrEqual(1);
  });

  it("a longer, specific, rating-consistent comment scores lower than a short generic one", () => {
    const specific = scoreReviewHeuristically({
      rating: 2,
      comment: "The technician arrived over an hour late and the pipe still leaks a little, though he was polite about it.",
    });
    const generic = scoreReviewHeuristically({ rating: 2, comment: "ok" });
    expect(specific.score).toBeLessThan(generic.score);
  });
});
