import { describe, expect, it } from "vitest";
import { buildWorkerOrderBy, buildWorkerWhere } from "./buildWorkerQuery";

describe("buildWorkerWhere", () => {
  it("returns an empty filter when nothing is set", () => {
    expect(buildWorkerWhere({})).toEqual({});
  });

  it("filters by category through the WorkerCategory join table", () => {
    const where = buildWorkerWhere({ categoryId: "cat_1" });
    expect(where.categories).toEqual({ some: { categoryId: "cat_1" } });
  });

  it("filters by area directly", () => {
    const where = buildWorkerWhere({ area: "GULSHAN" });
    expect(where.area).toBe("GULSHAN");
  });

  it("only adds an isAvailableNow constraint when explicitly requested", () => {
    expect(buildWorkerWhere({ availableNow: true }).isAvailableNow).toBe(true);
    expect(buildWorkerWhere({ availableNow: false }).isAvailableNow).toBeUndefined();
    expect(buildWorkerWhere({}).isAvailableNow).toBeUndefined();
  });

  it("builds a range-overlap filter for budget, not a strict containment check", () => {
    const where = buildWorkerWhere({ minBudget: 500, maxBudget: 800 });
    // A worker whose own range is e.g. 700-1200 should still be included
    // (their min <= customer's max, their max >= customer's min).
    expect(where.hourlyRateMinBdt).toEqual({ lte: 800 });
    expect(where.hourlyRateMaxBdt).toEqual({ gte: 500 });
  });

  it("applies only the side of the budget filter that was actually given", () => {
    expect(buildWorkerWhere({ minBudget: 500 })).toEqual({ hourlyRateMaxBdt: { gte: 500 } });
    expect(buildWorkerWhere({ maxBudget: 800 })).toEqual({ hourlyRateMinBdt: { lte: 800 } });
  });

  it("expands minTier into every tier at or above it", () => {
    const where = buildWorkerWhere({ minTier: "TIER2_SKILL_TESTED" });
    expect(where.verificationTier).toEqual({
      in: ["TIER2_SKILL_TESTED", "TIER3_POLICE_CLEARED"],
    });
  });

  it("combines every filter together", () => {
    const where = buildWorkerWhere({
      categoryId: "cat_1",
      area: "BANANI",
      minBudget: 400,
      maxBudget: 900,
      minTier: "TIER1_ID_VERIFIED",
      availableNow: true,
    });
    expect(where).toEqual({
      categories: { some: { categoryId: "cat_1" } },
      area: "BANANI",
      isAvailableNow: true,
      hourlyRateMinBdt: { lte: 900 },
      hourlyRateMaxBdt: { gte: 400 },
      verificationTier: {
        in: ["TIER1_ID_VERIFIED", "TIER2_SKILL_TESTED", "TIER3_POLICE_CLEARED"],
      },
    });
  });
});

describe("buildWorkerOrderBy", () => {
  it("defaults RELEVANCE to verification tier, then rating, then completed jobs", () => {
    expect(buildWorkerOrderBy("RELEVANCE")).toEqual([
      { verificationTier: "desc" },
      { ratingAvg: "desc" },
      { completedJobs: "desc" },
    ]);
  });

  it("sorts RATING by rating average then rating count", () => {
    expect(buildWorkerOrderBy("RATING")).toEqual([
      { ratingAvg: "desc" },
      { ratingCount: "desc" },
    ]);
  });

  it("sorts PRICE_LOW ascending by minimum rate", () => {
    expect(buildWorkerOrderBy("PRICE_LOW")).toEqual([{ hourlyRateMinBdt: "asc" }]);
  });

  it("sorts PRICE_HIGH descending by maximum rate", () => {
    expect(buildWorkerOrderBy("PRICE_HIGH")).toEqual([{ hourlyRateMaxBdt: "desc" }]);
  });

  it("sorts EXPERIENCE descending by years of experience", () => {
    expect(buildWorkerOrderBy("EXPERIENCE")).toEqual([{ yearsExperience: "desc" }]);
  });
});
