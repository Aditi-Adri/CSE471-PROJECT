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

/**
 * Pure function: filters -> Prisma `where` clause. Kept separate from the
 * API route so it can be unit tested without touching a real database.
 */
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

  // Budget filter is a range-overlap check: a worker matches if their
  // [hourlyRateMinBdt, hourlyRateMaxBdt] range overlaps the customer's
  // requested [minBudget, maxBudget] window at all, not just if it's
  // fully contained — a customer with a 500-800 BDT budget should still
  // see a worker whose range is 700-1200.
  if (typeof filters.maxBudget === "number") {
    where.hourlyRateMinBdt = { lte: filters.maxBudget };
  }
  if (typeof filters.minBudget === "number") {
    where.hourlyRateMaxBdt = { gte: filters.minBudget };
  }

  if (filters.minTier) {
    const allowedTiers = (Object.keys(TIER_RANK) as VerificationTier[]).filter(
      (tier) => TIER_RANK[tier] >= TIER_RANK[filters.minTier as VerificationTier]
    );
    where.verificationTier = { in: allowedTiers };
  }

  return where;
}

/**
 * Pure function: sort option -> Prisma `orderBy`. The default
 * (RELEVANCE) ranks verified, highly-rated, experienced workers first —
 * this is what implements "verification boosts search ranking" from the
 * spec.
 */
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
