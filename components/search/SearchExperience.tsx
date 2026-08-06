"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchBar } from "./SearchBar";
import { FilterPanel } from "./FilterPanel";
import { WorkerCard } from "./WorkerCard";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { EmptyState, ErrorState } from "./EmptyState";
import { DetectedCategoryBanner } from "./DetectedCategoryBanner";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { buildSearchUrl } from "@/lib/search/buildSearchUrl";
import type { SortOption } from "@/lib/validation/searchSchema";
import { EMPTY_FILTERS, type CategoryOption, type SearchApiResponse, type SearchFiltersState } from "@/lib/types/search";

export function SearchExperience() {
  const [queryInput, setQueryInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filters, setFilters] = useState<SearchFiltersState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortOption>("RELEVANCE");
  const [page, setPage] = useState(1);
  const [retryNonce, setRetryNonce] = useState(0);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [response, setResponse] = useState<SearchApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tracks which request (url + retry attempt) the current `response`/
  // `error` actually correspond to. Comparing against this — rather than
  // a separate `loading` boolean set synchronously inside the effect —
  // keeps every state update confined to the fetch's own callbacks.
  const [lastHandledKey, setLastHandledKey] = useState<string | null>(null);

  const debouncedFilters = useDebouncedValue(filters, 400);

  // Load the category list once, for the "manual override" filter dropdown.
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories: CategoryOption[] }) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  const requestUrl = useMemo(
    () => buildSearchUrl({ query: submittedQuery, filters: debouncedFilters, sort, page }),
    [submittedQuery, debouncedFilters, sort, page]
  );
  const attemptKey = `${requestUrl}#${retryNonce}`;

  const hasSearchIntent = submittedQuery.trim().length >= 2 || !!debouncedFilters.categoryId;
  const hasSearchedOnce = submittedQuery.trim().length >= 2 || !!filters.categoryId;
  const loading = hasSearchIntent && attemptKey !== lastHandledKey;

  useEffect(() => {
    if (!hasSearchIntent) return;

    const controller = new AbortController();

    fetch(requestUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        return (await res.json()) as SearchApiResponse;
      })
      .then((data) => {
        setResponse(data);
        setError(null);
        setLastHandledKey(attemptKey);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLastHandledKey(attemptKey);
      });

    return () => controller.abort();
  }, [attemptKey, hasSearchIntent, requestUrl]);

  // Once search intent disappears (query cleared, no category filter),
  // stop showing stale results/errors from the previous search.
  const visibleResponse = hasSearchIntent ? response : null;
  const visibleError = hasSearchIntent ? error : null;

  function handleSubmitSearch() {
    setSubmittedQuery(queryInput);
    setPage(1);
  }

  function handleFiltersChange(next: SearchFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleSortChange(next: SortOption) {
    setSort(next);
    setPage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Find a verified local technician
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Describe the problem in your own words — we&apos;ll match it to the right service
          category and show you nearby, background-checked workers.
        </p>
      </header>

      <SearchBar value={queryInput} onChange={setQueryInput} onSubmit={handleSubmitSearch} loading={loading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          categories={categories}
          sort={sort}
          onSortChange={handleSortChange}
        />

        <div className="flex flex-col gap-4">
          {visibleResponse?.detectedCategory && (
            <DetectedCategoryBanner
              category={visibleResponse.detectedCategory}
              method={visibleResponse.matchMethod}
              confidence={visibleResponse.matchConfidence}
            />
          )}

          {!hasSearchedOnce && !loading && (
            <EmptyState message='Describe a problem above (e.g. "water tap is leaking in kitchen") or pick a category filter to get started.' />
          )}

          {loading && <ResultsSkeleton />}

          {visibleError && !loading && (
            <ErrorState message={visibleError} onRetry={() => setRetryNonce((n) => n + 1)} />
          )}

          {!loading && !visibleError && visibleResponse && (
            <>
              <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>
                  {visibleResponse.total} {visibleResponse.total === 1 ? "technician" : "technicians"} found
                </span>
                <span>Search took {visibleResponse.durationMs}ms</span>
              </div>

              {visibleResponse.results.length === 0 ? (
                <EmptyState message="No technicians match those filters yet. Try widening your budget or removing a filter." />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleResponse.results.map((worker) => (
                    <WorkerCard key={worker.id} worker={worker} />
                  ))}
                </div>
              )}

              {visibleResponse.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:text-inherit dark:border-zinc-700 dark:hover:border-brand-600 dark:hover:text-brand-400 dark:disabled:hover:border-zinc-700"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Page {visibleResponse.page} of {visibleResponse.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= visibleResponse.totalPages}
                    onClick={() => setPage((p) => Math.min(visibleResponse.totalPages, p + 1))}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:text-inherit dark:border-zinc-700 dark:hover:border-brand-600 dark:hover:text-brand-400 dark:disabled:hover:border-zinc-700"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
