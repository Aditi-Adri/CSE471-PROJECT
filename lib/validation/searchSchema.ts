import { z } from "zod";

export const sortOptions = ["RELEVANCE", "RATING", "PRICE_LOW", "PRICE_HIGH", "EXPERIENCE"] as const;
export type SortOption = (typeof sortOptions)[number];

export const searchRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .max(300, "Keep it under 300 characters.")
    .optional()
    .default(""),
  filters: z
    .object({
      categoryId: z.string().min(1).optional(),
      area: z.string().optional(),
      minBudget: z.number().int().min(0).max(1_000_000).optional(),
      maxBudget: z.number().int().min(0).max(1_000_000).optional(),
      minTier: z.string().optional(),
      availableNow: z.boolean().optional(),
    })
    .optional()
    .default({}),
  sort: z.enum(sortOptions).optional().default("RELEVANCE"),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(12),
})
  .refine(
    (data) =>
      data.filters.minBudget === undefined ||
      data.filters.maxBudget === undefined ||
      data.filters.minBudget <= data.filters.maxBudget,
    { message: "Minimum budget can't be higher than maximum budget.", path: ["filters", "minBudget"] }
  );

export type SearchRequest = z.infer<typeof searchRequestSchema>;