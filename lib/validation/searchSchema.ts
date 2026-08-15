import { z } from "zod";
import { DHAKA_AREAS, VERIFICATION_TIERS } from "@/lib/constants/dhakaAreas";

const areaValues = DHAKA_AREAS.map((a) => a.value) as [string, ...string[]];
const tierValues = VERIFICATION_TIERS.map((t) => t.value) as [string, ...string[]];

export const sortOptions = ["RELEVANCE", "RATING", "PRICE_LOW", "PRICE_HIGH", "EXPERIENCE"] as const;
export type SortOption = (typeof sortOptions)[number];

export const searchRequestSchema = z.object({
  // Empty string is a valid, meaningful value here — it's what powers
  // the "browse everyone" default view when a customer hasn't typed
  // anything yet. Only a *non-empty-but-too-short* query (e.g. "a") is
  // rejected, via the refine below.
  query: z
    .string()
    .trim()
    .max(300, "Keep it under 300 characters.")
    .optional()
    .default(""),
  filters: z
    .object({
      categoryId: z.string().min(1).optional(),
      area: z.enum(areaValues).optional(),
      minBudget: z.number().int().min(0).max(1_000_000).optional(),
      maxBudget: z.number().int().min(0).max(1_000_000).optional(),
      minTier: z.enum(tierValues).optional(),
      availableNow: z.boolean().optional(),
    })
    .optional()
    .default({}),
  sort: z.enum(sortOptions).optional().default("RELEVANCE"),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(12),
})
  .refine((data) => data.query.length === 0 || data.query.length >= 2, {
    message: "Describe the problem in a few words, e.g. \"water tap is leaking\".",
    path: ["query"],
  })
  .refine(
    (data) =>
      data.filters.minBudget === undefined ||
      data.filters.maxBudget === undefined ||
      data.filters.minBudget <= data.filters.maxBudget,
    { message: "Minimum budget can't be higher than maximum budget.", path: ["filters", "minBudget"] }
  );

export type SearchRequest = z.infer<typeof searchRequestSchema>;
