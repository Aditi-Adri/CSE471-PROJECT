import type { SortOption } from "@/lib/validation/searchSchema";
import type { SearchFiltersState } from "@/lib/types/search";

/** Pure function: current search state -> the `/api/search` query string. */
export function buildSearchUrl(params: {
  query: string;
  filters: SearchFiltersState;
  sort: SortOption;
  page: number;
  pageSize?: number;
}): string {
  const { query, filters, sort, page, pageSize = 12 } = params;
  const search = new URLSearchParams();

  if (query.trim()) search.set("q", query.trim());
  if (filters.categoryId) search.set("categoryId", filters.categoryId);
  if (filters.area) search.set("area", filters.area);
  if (filters.minBudget !== null) search.set("minBudget", String(filters.minBudget));
  if (filters.maxBudget !== null) search.set("maxBudget", String(filters.maxBudget));
  if (filters.minTier) search.set("minTier", filters.minTier);
  if (filters.availableNow) search.set("availableNow", "true");
  search.set("sort", sort);
  search.set("page", String(page));
  search.set("pageSize", String(pageSize));

  return `/api/search?${search.toString()}`;
}
