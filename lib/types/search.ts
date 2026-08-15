import type { DhakaArea, VerificationTier } from "@/app/generated/prisma/client";
import type { SortOption } from "@/lib/validation/searchSchema";

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
};

export type WorkerCategoryTag = {
  id: string;
  name: string;
  icon: string;
  slug: string;
  isPrimary: boolean;
};

export type WorkerResult = {
  id: string;
  name: string;
  headline: string;
  bio: string;
  area: DhakaArea;
  addressDetail: string;
  hourlyRateMinBdt: number;
  hourlyRateMaxBdt: number;
  verificationTier: VerificationTier;
  yearsExperience: number;
  isAvailableNow: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  /** MODULE 2 -> FEATURE 1 (Shiva): cached 0-100 composite reliability score. Null only very briefly right after Worker creation. */
  trustScore: number | null;
  avatarSeed: string;
  categories: WorkerCategoryTag[];
};

export type DetectedCategory = { id: string; name: string; icon: string } | null;

export type SearchApiResponse = {
  query: string;
  detectedCategory: DetectedCategory;
  matchMethod: "AI" | "KEYWORD" | "MANUAL_FILTER" | "NONE";
  matchConfidence: number | null;
  sort: SortOption;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  durationMs: number;
  results: WorkerResult[];
};

export type SearchFiltersState = {
  categoryId: string | null;
  area: DhakaArea | null;
  minBudget: number | null;
  maxBudget: number | null;
  minTier: VerificationTier | null;
  availableNow: boolean;
};

export const EMPTY_FILTERS: SearchFiltersState = {
  categoryId: null,
  area: null,
  minBudget: null,
  maxBudget: null,
  minTier: null,
  availableNow: false,
};
