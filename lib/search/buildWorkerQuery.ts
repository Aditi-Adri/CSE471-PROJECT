import type { Prisma, DhakaArea, VerificationTier } from "@/app/generated/prisma/client";
import type { SortOption } from "@/lib/validation/searchSchema";

export type WorkerSearchFilters = {
  categoryId?: string | null;
  area?: DhakaArea;
  minBudget?: number;
  maxBudget?: number;
  minTier?: VerificationTier;
  availableNow?: boolean;
};

export const TIER_RANK: Record<VerificationTier, number> = {
  UNVERIFIED: 0,
  TIER1_ID_VERIFIED: 1,
  TIER2_SKILL_TESTED: 2,
  TIER3_POLICE_CLEARED: 3,
};

// Turns the search filters into a Prisma `where` clause. Kept separate
// from the API route so it can be unit tested with no database needed.
export function buildWorkerWhere(filters: WorkerSearchFilters): Prisma.WorkerWhereInput {
  const where: Prisma.WorkerWhereInput = {};

  if (filters.categoryId) {
    where.categories = { some: { categoryId: filters.categoryId } };
  }

  if (filters.area) {
    where.area = filters.area;
  }

  if (filters.availableNow) {
    where.isAvailableNow = true;
  }

  // Budget is a range-overlap check, not "fully contained": a worker
  // whose rate is 700-1200 should still show up for a 500-800 budget,
  // since the ranges overlap.
  if (typeof filters.maxBudget === "number") {
    where.hourlyRateMinBdt = { lte: filters.maxBudget };
  }
  if (typeof filters.minBudget === "number") {
    where.hourlyRateMaxBdt = { gte: filters.minBudget };
  }

  if (filters.minTier) {
    // Keep every tier that's at least as high as the one requested.
    const minRank = TIER_RANK[filters.minTier];
    const allowedTiers: VerificationTier[] = [];
    for (const tier in TIER_RANK) {
      const tierKey = tier as VerificationTier;
      if (TIER_RANK[tierKey] >= minRank) {
        allowedTiers.push(tierKey);
      }
    }
    where.verificationTier = { in: allowedTiers };
  }

  return where;
}

// Turns a sort option into a Prisma `orderBy`. The default (RELEVANCE)
// ranks verified, highly-rated, experienced workers first.
export function buildWorkerOrderBy(
  sort: SortOption
): Prisma.WorkerOrderByWithRelationInput[] {
  switch (sort) {
    case "RATING":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "PRICE_LOW":
      return [{ hourlyRateMinBdt: "asc" }];
    case "PRICE_HIGH":
      return [{ hourlyRateMaxBdt: "desc" }];
    case "EXPERIENCE":
      return [{ yearsExperience: "desc" }];
    case "RELEVANCE":
    default:
      return [
        { verificationTier: "desc" },
        { ratingAvg: "desc" },
        { completedJobs: "desc" },
      ];
  }
}
